import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { formatTime } from '@/lib/timer-utils';
import AgoraRTC, { type IAgoraRTCClient, type IAgoraRTCRemoteUser, type ICameraVideoTrack, type IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';

interface VideoRoomProps {
  sessionId: string;
  channelName: string;
  uid: string;
  currentUser: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  otherUser: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  remainingTime: number;
  onLeave: () => void;
}

export default function VideoRoom({ 
  sessionId, 
  channelName, 
  uid, 
  currentUser, 
  otherUser, 
  remainingTime, 
  onLeave 
}: VideoRoomProps) {
  const { toast } = useToast();
  
  // Agora state
  const [agoraClient, setAgoraClient] = useState<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    
    const initAgora = async () => {
      try {
        console.log('VideoRoom: Initializing Agora for channel:', channelName, 'with UID:', uid);
        setIsConnecting(true);
        setConnectionError(null);
        
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        
        // Set up event handlers before joining
        client.on('user-published', async (user, mediaType) => {
          if (!mounted) return;
          
          console.log('VideoRoom: Remote user published:', user.uid, mediaType);
          await client.subscribe(user, mediaType);
          
          if (mediaType === 'video') {
            setRemoteUsers((prev) => [...prev.filter((u) => u.uid !== user.uid), user]);
            
            // Wait for DOM to update then play video
            setTimeout(() => {
              if (remoteVideoRef.current && user.videoTrack) {
                user.videoTrack.play(remoteVideoRef.current);
              }
            }, 100);
          }
          
          if (mediaType === 'audio' && user.audioTrack) {
            user.audioTrack.play();
          }
        });

        client.on('user-unpublished', (user, mediaType) => {
          if (!mounted) return;
          console.log('VideoRoom: Remote user unpublished:', user.uid, mediaType);
          
          if (mediaType === 'video') {
            setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
          }
        });

        client.on('user-left', (user) => {
          if (!mounted) return;
          console.log('VideoRoom: Remote user left:', user.uid);
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });

        // Get token from server with authentication
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession?.access_token) {
          throw new Error('No auth session available');
        }
        
        const tokenResponse = await fetch(
          `/api/agora/token?channel=${channelName}&role=host&uid=${uid}`,
          {
            headers: {
              'Authorization': `Bearer ${authSession.access_token}`
            },
            credentials: 'include'
          }
        );
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('VideoRoom: Token fetch failed:', tokenResponse.status, errorText);
          throw new Error(`Failed to get Agora token: ${errorText}`);
        }
        
        const { token, appId } = await tokenResponse.json();
        console.log('VideoRoom: Got Agora token, appId:', appId);
        
        // Use the appId from response or fallback to env var
        const finalAppId = appId || import.meta.env.VITE_AGORA_APP_ID;
        if (!finalAppId) {
          throw new Error('Agora App ID not configured');
        }

        // Join channel with string UID
        console.log('VideoRoom: Joining channel:', channelName, 'with UID:', uid);
        await client.join(finalAppId, channelName, token || null, uid);
        console.log('VideoRoom: Successfully joined Agora channel');

        if (!mounted) {
          await client.leave();
          return;
        }

        setAgoraClient(client);

        // Create and publish local tracks
        try {
          const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
            { 
              AEC: true,  // Acoustic Echo Cancellation
              ANS: true,  // Automatic Noise Suppression
              AGC: true   // Automatic Gain Control
            },
            {
              encoderConfig: "720p_2"
            }
          );

          if (!mounted) {
            audioTrack.stop();
            audioTrack.close();
            videoTrack.stop();
            videoTrack.close();
            await client.leave();
            return;
          }

          setLocalAudioTrack(audioTrack);
          setLocalVideoTrack(videoTrack);

          await client.publish([audioTrack, videoTrack]);
          console.log('VideoRoom: Published local tracks');

          // Play local video
          if (localVideoRef.current) {
            videoTrack.play(localVideoRef.current);
          }

          setIsConnecting(false);
        } catch (mediaError) {
          console.error('VideoRoom: Media access error:', mediaError);
          
          // Still mark as connected even if media fails
          setIsConnecting(false);
          
          const errorMessage = mediaError instanceof Error ? mediaError.message : 'Unknown error';
          if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowedError')) {
            setConnectionError('Camera/microphone permissions denied. Please check your browser settings.');
            toast({
              title: 'Media Access Required',
              description: 'Please allow camera and microphone access to join the video call.',
              variant: 'destructive',
            });
          } else {
            setConnectionError('Failed to access camera/microphone. Video call will continue without your video.');
            toast({
              title: 'Media Access Failed',
              description: 'Unable to access camera/microphone. You can still see and hear others.',
            });
          }
        }
      } catch (error) {
        console.error('VideoRoom: Init error:', error);
        
        if (!mounted) return;
        
        setIsConnecting(false);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('token')) {
          setConnectionError('Authentication failed. Please refresh and try again.');
        } else if (errorMessage.includes('network')) {
          setConnectionError('Network connection issue. Please check your internet connection.');
        } else {
          setConnectionError('Failed to connect to video call. Please try again.');
        }
        
        toast({
          title: 'Connection Failed',
          description: connectionError || 'Unable to establish video connection.',
          variant: 'destructive',
        });
      }
    };

    initAgora();

    return () => {
      mounted = false;
      // Cleanup will be handled by cleanupAgora
    };
  }, [channelName, uid, toast]);

  // Cleanup function
  const cleanupAgora = async () => {
    try {
      console.log('VideoRoom: Cleaning up Agora resources');
      
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
      
      setRemoteUsers([]);
    } catch (error) {
      console.error('VideoRoom: Cleanup error:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAgora();
    };
  }, []);

  const toggleVideo = async () => {
    if (localVideoTrack) {
      const newState = !isVideoEnabled;
      await localVideoTrack.setEnabled(newState);
      setIsVideoEnabled(newState);
      
      toast({
        title: newState ? 'Camera On' : 'Camera Off',
        description: newState ? 'Your camera is now visible' : 'Your camera is now hidden',
      });
    }
  };

  const toggleAudio = async () => {
    if (localAudioTrack) {
      const newState = !isAudioEnabled;
      await localAudioTrack.setEnabled(newState);
      setIsAudioEnabled(newState);
      
      toast({
        title: newState ? 'Microphone On' : 'Microphone Off',
        description: newState ? 'You are now unmuted' : 'You are now muted',
      });
    }
  };

  const handleLeave = async () => {
    await cleanupAgora();
    onLeave();
  };

  // Check if remote user is connected
  const isRemoteConnected = remoteUsers.length > 0;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Badge variant="default" className="text-lg px-4 py-2" data-testid="badge-phase-live">
              Live Session
            </Badge>
            <div className="text-xl font-semibold text-primary" data-testid="text-timer-live">
              {formatTime(remainingTime)}
            </div>
          </div>
          
          {connectionError && (
            <Badge variant="destructive" className="px-4 py-2">
              {connectionError}
            </Badge>
          )}
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Local Video */}
          <Card className="relative aspect-video overflow-hidden bg-muted">
            <div 
              ref={localVideoRef}
              className="absolute inset-0 w-full h-full"
              data-testid="video-local"
            />
            
            {/* Show avatar when video is off */}
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={currentUser.avatarUrl || undefined} />
                  <AvatarFallback className="text-4xl">
                    {currentUser.displayName?.[0]?.toUpperCase() || 'Y'}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            
            {/* Loading indicator */}
            {isConnecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Connecting...</p>
                </div>
              </div>
            )}
            
            {/* Name label */}
            <div className="absolute bottom-4 left-4">
              <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                {currentUser.displayName || 'You'}
                {!isVideoEnabled && ' (Camera Off)'}
                {!isAudioEnabled && ' 🔇'}
              </Badge>
            </div>
          </Card>

          {/* Remote Video */}
          <Card className="relative aspect-video overflow-hidden bg-muted">
            <div 
              ref={remoteVideoRef}
              className="absolute inset-0 w-full h-full"
              data-testid="video-remote"
            />
            
            {/* Show avatar when no remote video */}
            {!isRemoteConnected && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={otherUser.avatarUrl || undefined} />
                  <AvatarFallback className="text-4xl">
                    {otherUser.displayName?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            
            {/* Waiting for other user */}
            {!isRemoteConnected && !isConnecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <p className="text-sm text-muted-foreground">Waiting for {otherUser.displayName || 'other user'}...</p>
              </div>
            )}
            
            {/* Name label */}
            <div className="absolute bottom-4 left-4">
              <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                {otherUser.displayName || 'Other User'}
                {!isRemoteConnected && ' (Connecting...)'}
              </Badge>
            </div>
          </Card>
        </div>

        {/* Controls */}
        <Card className="p-4">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleVideo}
              disabled={!localVideoTrack}
              data-testid="button-toggle-video"
            >
              {isVideoEnabled ? (
                <>
                  <Video className="h-5 w-5 mr-2" />
                  Camera On
                </>
              ) : (
                <>
                  <VideoOff className="h-5 w-5 mr-2" />
                  Camera Off
                </>
              )}
            </Button>

            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleAudio}
              disabled={!localAudioTrack}
              data-testid="button-toggle-audio"
            >
              {isAudioEnabled ? (
                <>
                  <Mic className="h-5 w-5 mr-2" />
                  Mic On
                </>
              ) : (
                <>
                  <MicOff className="h-5 w-5 mr-2" />
                  Mic Off
                </>
              )}
            </Button>

            <Button
              variant="destructive"
              size="lg"
              onClick={handleLeave}
              data-testid="button-leave-session"
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              End Session
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}