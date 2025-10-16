import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { calculateRemainingTime, formatTime } from '@/lib/timer-utils';
import { playNotificationSound, showBrowserNotification } from '@/lib/notification-utils';
import type { SessionWithParticipants } from '@shared/schema';
import VideoRoom from '@/components/VideoRoom';

export default function SessionPage() {
  const [, params] = useRoute('/s/:id');
  const [, setLocation] = useLocation();
  const { profile: currentUser } = useAuth();
  const { toast } = useToast();
  const sessionId = params?.id;

  const [remainingTime, setRemainingTime] = useState(0);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);

  // Fetch session
  const { data: session, isLoading } = useQuery<SessionWithParticipants>({
    queryKey: [`/api/sessions/${sessionId}`],
    enabled: !!sessionId,
    refetchInterval: 2000,
  });

  // Acknowledge mutation (for practitioners)
  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/sessions/acknowledge', { sessionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${sessionId}`] });
      toast({ 
        title: '✅ Session acknowledged', 
        description: 'Guest has been notified that you have seen their request.' 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to acknowledge', 
        description: error.message || 'Please try again',
        variant: 'destructive' 
      });
    },
  });

  // Mark ready mutation
  const markReadyMutation = useMutation({
    mutationFn: async () => {
      const who = currentUser?.id === session?.guestId ? 'guest' : 'practitioner';
      return apiRequest('POST', '/api/sessions/ready', { sessionId, who });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${sessionId}`] });
      toast({ title: '✅ You are ready!', description: 'Waiting for the other participant...' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to mark ready', 
        description: error.message || 'Please try again',
        variant: 'destructive' 
      });
    },
  });

  // End session mutation
  const endSessionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/sessions/end', { sessionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${sessionId}`] });
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
    if (!sessionId || !session) return;

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
        async (payload) => {
          queryClient.invalidateQueries({ queryKey: [`/api/sessions/${sessionId}`] });
          
          // Show notifications for important events
          const updatedSession = payload.new as any;
          
          if (updatedSession.phase === 'live' && session.phase === 'waiting') {
            toast({
              title: '🎥 Session Starting!',
              description: 'Video connection is being established...',
            });
            playNotificationSound();
            if (document.hidden) {
              showBrowserNotification('Session Starting!', 'Video connection is being established...');
            }
          }
          
          if (updatedSession.acknowledged_practitioner && !session.acknowledgedPractitioner) {
            toast({
              title: '👋 Practitioner acknowledged',
              description: 'Practitioner has seen your request and will join soon.',
            });
            playNotificationSound();
          }
          
          if (updatedSession.ready_practitioner && !session.readyPractitioner) {
            toast({
              title: '✅ Practitioner is ready',
              description: 'Waiting for both parties to be ready...',
            });
            playNotificationSound();
          }
          
          if (updatedSession.ready_guest && !session.readyGuest) {
            toast({
              title: '✅ Guest is ready',
              description: 'Waiting for both parties to be ready...',
            });
            playNotificationSound();
          }
          
          if (updatedSession.phase === 'ended') {
            toast({
              title: '📱 Session Ended',
              description: 'The session has been completed',
            });
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, session, toast]);

  // Timer countdown
  useEffect(() => {
    if (!session) return;

    const updateTimer = () => {
      if (session.phase === 'waiting') {
        const startedAt = session.waitingStartedAt || null;
        const remaining = calculateRemainingTime(startedAt, session.waitingSeconds);
        setRemainingTime(remaining);
        
        // Check if both are ready to transition to live
        if (session.readyPractitioner && session.readyGuest) {
          // Both ready - transition should happen automatically
          queryClient.invalidateQueries({ queryKey: [`/api/sessions/${sessionId}`] });
        }
        
        if (remaining === 0 && !session.readyPractitioner && !session.readyGuest) {
          // Auto-transition failsafe - end session if time runs out with nobody ready
          endSessionMutation.mutate();
        }
      } else if (session.phase === 'live') {
        const startedAt = session.liveStartedAt || null;
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
  }, [session, sessionId, endSessionMutation]);

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
  const isPractitioner = currentUser.id === session.practitionerId;
  const otherUser = isGuest ? session.practitioner : session.guest;
  const isReady = isGuest ? session.readyGuest : session.readyPractitioner;
  const otherReady = isGuest ? session.readyPractitioner : session.readyGuest;
  const hasAcknowledged = session.acknowledgedPractitioner;

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

            <div className="flex items-center justify-center gap-12 mb-8">
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

            {/* Status indicators */}
            <div className="mb-8 space-y-2">
              {isPractitioner && hasAcknowledged && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Session acknowledged ✓
                </p>
              )}
              {isGuest && hasAcknowledged && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Practitioner acknowledged ✓
                </p>
              )}
              {session.readyPractitioner && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Practitioner ready ✓
                </p>
              )}
              {session.readyGuest && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Guest ready ✓
                </p>
              )}
            </div>

            {/* Action buttons based on role and state */}
            {isPractitioner && !hasAcknowledged && (
              <Button
                size="lg"
                className="text-xl px-12 py-6"
                onClick={() => acknowledgeMutation.mutate()}
                disabled={acknowledgeMutation.isPending}
                data-testid="button-acknowledge"
              >
                {acknowledgeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Acknowledging...
                  </>
                ) : (
                  "Acknowledge Request"
                )}
              </Button>
            )}

            {isPractitioner && hasAcknowledged && !isReady && (
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

            {isGuest && !isReady && (
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

  // Live Video Room
  if (session.phase === 'live') {
    // Determine the UID for the current user
    const uid = isGuest ? session.agoraUidGuest : session.agoraUidPractitioner;
    
    return (
      <VideoRoom
        sessionId={sessionId!}
        channelName={session.agoraChannel || ''}
        uid={uid || ''}
        currentUser={{
          id: currentUser.id,
          displayName: currentUser.displayName,
          avatarUrl: currentUser.avatarUrl,
        }}
        otherUser={{
          id: otherUser.id,
          displayName: otherUser.displayName,
          avatarUrl: otherUser.avatarUrl,
        }}
        remainingTime={remainingTime}
        onLeave={() => endSessionMutation.mutate()}
      />
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