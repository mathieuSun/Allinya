import { useEffect, useState, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check, Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { calculateRemainingTime, formatTime } from '@/lib/timer-utils';
import type { SessionWithParticipants } from '@shared/schema';
import AgoraRTC, { type IAgoraRTCClient, type IAgoraRTCRemoteUser, type ICameraVideoTrack, type IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';

export default function SessionPage() {
  const [, params] = useRoute('/s/:id');
  const [, setLocation] = useLocation();
  const { profile: currentUser } = useAuth();
  const { toast } = useToast();
  const sessionId = params?.id;

  const [remainingTime, setRemainingTime] = useState(0);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);

  // Agora state
  const [agoraClient, setAgoraClient] = useState<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [agoraJoined, setAgoraJoined] = useState(false);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  // Fetch session
  const { data: session, isLoading } = useQuery<SessionWithParticipants>({
    queryKey: [`/api/sessions/${sessionId}`],
    enabled: !!sessionId,
    refetchInterval: 2000,
  });

  // Mark ready mutation
  const markReadyMutation = useMutation({
    mutationFn: async () => {
      const who = currentUser?.id === session?.guestId ? 'guest' : 'practitioner';
      return apiRequest('POST', '/api/sessions/ready', { sessionId, who });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${sessionId}`] });
    },
  });

  // End session mutation
  const endSessionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/sessions/end', { sessionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${sessionId}`] });
      cleanupAgora();
    },
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/reviews', {
        sessionId,
        rating,
        comment,
      });
    },
    onSuccess: () => {
      toast({ title: 'Thank you for your feedback!' });
      setLocation('/explore');
    },
  });

  // Subscribe to session updates
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [`/api/sessions/${sessionId}`] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Timer countdown
  useEffect(() => {
    if (!session) return;

    const updateTimer = () => {
      if (session.phase === 'waiting') {
        const startedAt = session.waitingStartedAt ? new Date(session.waitingStartedAt).toISOString() : null;
        const remaining = calculateRemainingTime(startedAt, session.waitingSeconds);
        setRemainingTime(remaining);
        
        if (remaining === 0 && !session.readyPractitioner && !session.readyGuest) {
          // Auto-transition failsafe
          endSessionMutation.mutate();
        }
      } else if (session.phase === 'live') {
        const startedAt = session.liveStartedAt ? new Date(session.liveStartedAt).toISOString() : null;
        const remaining = calculateRemainingTime(startedAt, session.liveSeconds);
        setRemainingTime(remaining);
        
        if (remaining === 0) {
          endSessionMutation.mutate();
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Agora setup for live phase
  useEffect(() => {
    if (session?.phase === 'live' && !agoraJoined) {
      initAgora();
    }

    return () => {
      if (session?.phase !== 'live') {
        cleanupAgora();
      }
    };
  }, [session?.phase]);

  const initAgora = async () => {
    if (!session || !currentUser) return;

    try {
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      setAgoraClient(client);

      const isGuest = currentUser.id === session.guestId;
      const uid = isGuest ? session.agoraUidGuest : session.agoraUidPractitioner;

      // Get token from server
      const tokenResponse = await fetch(
        `/api/agora/token?channel=${session.agoraChannel}&role=host&uid=${uid}`
      );
      const { token } = await tokenResponse.json();

      // Join channel
      await client.join(import.meta.env.VITE_AGORA_APP_ID, session.agoraChannel, token, uid);

      // Create and publish local tracks
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      await client.publish([audioTrack, videoTrack]);

      // Play local video
      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
      }

      // Handle remote users
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        
        if (mediaType === 'video') {
          setRemoteUsers((prev) => [...prev.filter((u) => u.uid !== user.uid), user]);
          
          if (remoteVideoRef.current) {
            user.videoTrack?.play(remoteVideoRef.current);
          }
        }
        
        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
      });

      client.on('user-unpublished', (user) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });

      setAgoraJoined(true);
    } catch (error) {
      console.error('Agora init error:', error);
      toast({
        title: 'Video connection failed',
        description: 'Please check your camera and microphone permissions',
        variant: 'destructive',
      });
    }
  };

  const cleanupAgora = async () => {
    if (localVideoTrack) {
      localVideoTrack.stop();
      localVideoTrack.close();
      setLocalVideoTrack(null);
    }
    
    if (localAudioTrack) {
      localAudioTrack.stop();
      localAudioTrack.close();
      setLocalAudioTrack(null);
    }
    
    if (agoraClient) {
      await agoraClient.leave();
      setAgoraClient(null);
    }
    
    setAgoraJoined(false);
    setRemoteUsers([]);
  };

  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const leaveSession = async () => {
    await cleanupAgora();
    endSessionMutation.mutate();
  };

  if (!currentUser) {
    setLocation('/auth');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-muted-foreground">Session not found</p>
      </div>
    );
  }

  const isGuest = currentUser.id === session.guestId;
  const otherUser = isGuest ? session.practitioner : session.guest;
  const isReady = isGuest ? session.readyGuest : session.readyPractitioner;
  const otherReady = isGuest ? session.readyPractitioner : session.readyGuest;

  // Waiting Room
  if (session.phase === 'waiting') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12 text-center">
            <Badge className="mb-8 text-lg px-4 py-2" data-testid="badge-phase-waiting">Waiting Room</Badge>
            
            <div className="text-hero md:text-hero-md font-bold mb-8 text-primary" data-testid="text-timer">
              {formatTime(remainingTime)}
            </div>

            <div className="flex items-center justify-center gap-12 mb-12">
              <div className="text-center">
                <Avatar className="h-20 w-20 mx-auto mb-3">
                  <AvatarImage src={currentUser.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl">
                    {currentUser.displayName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium mb-2">{currentUser.displayName}</p>
                {isReady ? (
                  <Badge variant="default" className="gap-1" data-testid="badge-ready-self">
                    <Check className="h-3 w-3" />
                    Ready
                  </Badge>
                ) : (
                  <Badge variant="secondary" data-testid="badge-waiting-self">Waiting</Badge>
                )}
              </div>

              <div className="text-center">
                <Avatar className="h-20 w-20 mx-auto mb-3">
                  <AvatarImage src={otherUser.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl">
                    {otherUser.displayName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium mb-2">{otherUser.displayName}</p>
                {otherReady ? (
                  <Badge variant="default" className="gap-1" data-testid="badge-ready-other">
                    <Check className="h-3 w-3" />
                    Ready
                  </Badge>
                ) : (
                  <Badge variant="secondary" data-testid="badge-waiting-other">Waiting</Badge>
                )}
              </div>
            </div>

            {!isReady && (
              <Button
                size="lg"
                className="text-xl px-12 py-6"
                onClick={() => markReadyMutation.mutate()}
                disabled={markReadyMutation.isPending}
                data-testid="button-ready"
              >
                {markReadyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Setting Ready...
                  </>
                ) : (
                  "I'm Ready"
                )}
              </Button>
            )}

            {isReady && !otherReady && (
              <p className="text-muted-foreground">Waiting for {otherUser.displayName} to be ready...</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Live Video
  if (session.phase === 'live') {
    return (
      <div className="min-h-screen bg-black relative">
        {/* Timer Bar */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xl font-semibold" data-testid="text-live-timer">{formatTime(remainingTime)}</span>
            </div>
            <Badge variant="destructive" data-testid="badge-phase-live">LIVE</Badge>
          </div>
        </div>

        {/* Video Grid */}
        <div className="h-screen grid grid-cols-1 md:grid-cols-2 gap-2 p-2 pt-20">
          <div ref={remoteVideoRef} className="relative bg-muted rounded-lg overflow-hidden" data-testid="video-remote">
            {remoteUsers.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Avatar className="h-32 w-32 mb-4">
                  <AvatarImage src={otherUser.avatarUrl || undefined} />
                  <AvatarFallback className="text-4xl">
                    {otherUser.displayName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-muted-foreground">{otherUser.displayName}</p>
              </div>
            )}
          </div>
          <div ref={localVideoRef} className="relative bg-muted rounded-lg overflow-hidden" data-testid="video-local">
            <div className="absolute bottom-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded">
              You
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
          <Button
            size="icon"
            variant={isVideoEnabled ? 'secondary' : 'destructive'}
            className="h-14 w-14 rounded-full"
            onClick={toggleVideo}
            data-testid="button-toggle-video"
          >
            {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
          <Button
            size="icon"
            variant={isAudioEnabled ? 'secondary' : 'destructive'}
            className="h-14 w-14 rounded-full"
            onClick={toggleAudio}
            data-testid="button-toggle-audio"
          >
            {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="h-14 w-14 rounded-full"
            onClick={leaveSession}
            data-testid="button-leave"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    );
  }

  // End Screen
  if (session.phase === 'ended') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <div className="mb-8">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Session Complete</h2>
              <p className="text-muted-foreground">Thank you for sharing this energy</p>
            </div>

            {isGuest && (
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm font-medium mb-3">How was your experience?</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="transition-colors"
                        data-testid={`button-rating-${star}`}
                      >
                        <svg
                          className={`h-8 w-8 ${
                            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-muted-foreground'
                          }`}
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  placeholder="Share your thoughts (optional)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  data-testid="input-review-comment"
                />

                <Button
                  className="w-full"
                  onClick={() => submitReviewMutation.mutate()}
                  disabled={submitReviewMutation.isPending || rating === 0}
                  data-testid="button-submit-review"
                >
                  {submitReviewMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation(isGuest ? '/explore' : '/profile')}
              data-testid="button-done"
            >
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
