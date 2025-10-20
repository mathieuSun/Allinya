import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { playNotificationSound, requestNotificationPermission, showBrowserNotification } from '@/lib/notification-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Clock, Video, Check, X, Loader2, Power, PowerOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { SessionCountdown } from '@/components/SessionCountdown';
import type { SessionWithParticipants } from '@shared/schema';

export default function PractitionerDashboard() {
  const [, setLocation] = useLocation();
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [pendingSessions, setPendingSessions] = useState<SessionWithParticipants[]>([]);

  // Check if practitioner
  if (!profile) {
    setLocation('/auth');
    return null;
  }

  if (profile.role !== 'practitioner') {
    setLocation('/explore');
    return null;
  }

  // Fetch practitioner status
  const { data: practitionerStatus } = useQuery<{ isOnline: boolean }>({
    queryKey: ['/api/practitioners/status'],
  });

  // Fetch active/pending sessions
  const { data: sessions, isLoading, isFetching } = useQuery<SessionWithParticipants[]>({
    queryKey: ['/api/sessions/practitioner'],
    refetchInterval: 1000, // Poll every 1 second for better responsiveness
  });

  // Track session state for notification logic
  const [hasLoadedSessions, setHasLoadedSessions] = useState(false);
  const [previousSessionCount, setPreviousSessionCount] = useState(0);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  // Request notification permission on mount (once)
  useEffect(() => {
    if (!hasRequestedPermission && practitionerStatus?.isOnline) {
      requestNotificationPermission();
      setHasRequestedPermission(true);
    }
  }, [practitionerStatus?.isOnline, hasRequestedPermission]);

  // Update pending sessions and show notifications for new ones
  useEffect(() => {
    if (sessions) {
      const pending = sessions.filter(s => s.phase === 'waiting');
      setPendingSessions(pending);
      
      // Check if there are NEW sessions (count increased)
      // Show notification if: we've loaded before AND count increased
      if (hasLoadedSessions && pending.length > previousSessionCount) {
        // Get the newest session for notification details
        const newestSession = pending[pending.length - 1];
        const guestName = newestSession?.guest?.displayName || 'A guest';
        
        // Show toast notification
        toast({
          title: '🔔 New Session Request!',
          description: `${guestName} is requesting a healing session`,
        });
        
        // Play notification sound
        playNotificationSound();
        
        // Show browser notification if page is not focused
        if (document.hidden) {
          showBrowserNotification(
            'New Session Request!',
            `${guestName} is requesting a healing session`,
          );
        }
      }
      
      // Mark as loaded and update count
      setHasLoadedSessions(true);
      setPreviousSessionCount(pending.length);
    }
  }, [sessions, toast, hasLoadedSessions, previousSessionCount]);

  // Toggle online status
  const toggleOnlineMutation = useMutation({
    mutationFn: async (online: boolean) => {
      // Use the user ID from the profile since we're already authenticated
      const userId = profile?.id;
      if (!userId) throw new Error('User ID not found');
      return apiRequest('PATCH', `/api/practitioners/${userId}/status`, { isOnline: online });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/practitioners/status'] });
      toast({ 
        title: data.message || (data.isOnline ? 'You are now online' : 'You are now offline'),
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update status',
        description: error.message || 'Unable to update online status',
        variant: 'destructive',
      });
    },
  });

  // Accept session
  const acceptSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest('POST', '/api/sessions/accept', { sessionId });
    },
    onSuccess: (data: any, sessionId: string) => {
      toast({ title: 'Session accepted!' });
      setLocation(`/s/${sessionId}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to accept session',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reject session
  const rejectSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest('POST', '/api/sessions/reject', { sessionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions/practitioner'] });
      toast({ title: 'Session declined' });
    },
  });

  const activeSessions = sessions?.filter(s => s.phase === 'live') || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border backdrop-blur-lg bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10" key={profile?.avatarUrl || 'no-avatar-dashboard'}>
                <AvatarImage src={profile?.avatarUrl || undefined} />
                <AvatarFallback>
                  {profile?.displayName?.[0]?.toUpperCase() || 'P'}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold">Practitioner Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant={practitionerStatus?.isOnline ? 'default' : 'outline'}
                onClick={() => {
                  // Ensure we have a boolean value - default to false if undefined
                  const currentStatus = practitionerStatus?.isOnline ?? false;
                  toggleOnlineMutation.mutate(!currentStatus);
                }}
                disabled={toggleOnlineMutation.isPending}
                data-testid="button-toggle-online"
              >
                {practitionerStatus?.isOnline ? (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    Online
                  </>
                ) : (
                  <>
                    <PowerOff className="mr-2 h-4 w-4" />
                    Offline
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setLocation('/profile')} data-testid="button-profile">
                My Profile
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  await signOut();
                  setLocation('/login');
                }}
                data-testid="button-logout"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Status Banner */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-3 w-3 rounded-full ${practitionerStatus?.isOnline ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`} />
                <div>
                  <p className="font-semibold">
                    You are {practitionerStatus?.isOnline ? 'online' : 'offline'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {practitionerStatus?.isOnline 
                      ? 'Guests can request sessions with you'
                      : 'Go online to receive session requests'}
                  </p>
                </div>
              </div>
              {pendingSessions.length > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  <Bell className="mr-1 h-3 w-3" />
                  {pendingSessions.length} Pending
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Sessions */}
        {pendingSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Incoming Session Requests
            </h2>
            <div className="grid gap-4">
              {pendingSessions.map((session) => (
                <Card key={session.id} className="border-primary/20">
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={session.guest?.avatarUrl || undefined} />
                          <AvatarFallback>
                            {session.guest?.displayName?.[0]?.toUpperCase() || 'G'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{session.guest?.displayName || 'Guest'}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {Math.floor(session.liveSeconds / 60)} minute session
                          </div>
                          <div className="mt-1">
                            <SessionCountdown 
                              sessionCreatedAt={session.createdAt || new Date().toISOString()} 
                              onExpired={() => {
                                // Refresh sessions to remove expired ones
                                queryClient.invalidateQueries({ queryKey: ['/api/sessions/practitioner'] });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => acceptSessionMutation.mutate(session.id)}
                          disabled={acceptSessionMutation.isPending}
                          data-testid={`button-accept-${session.id}`}
                        >
                          {acceptSessionMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="mr-1 h-4 w-4" />
                              Accept
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectSessionMutation.mutate(session.id)}
                          disabled={rejectSessionMutation.isPending}
                          data-testid={`button-reject-${session.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Video className="h-5 w-5 text-green-500" />
              Active Sessions
            </h2>
            <div className="grid gap-4">
              {activeSessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={session.guest?.avatarUrl || undefined} />
                          <AvatarFallback>
                            {session.guest?.displayName?.[0]?.toUpperCase() || 'G'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{session.guest?.displayName || 'Guest'}</p>
                          <Badge variant="default" className="bg-green-500">
                            Live Now
                          </Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => setLocation(`/s/${session.id}`)}
                        data-testid={`button-join-${session.id}`}
                      >
                        <Video className="mr-2 h-4 w-4" />
                        Join Session
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State - Only show after initial load, not during refetches */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          !isFetching && !pendingSessions.length && !activeSessions.length && (
            <Card>
              <CardContent className="py-20 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active sessions</h3>
                <p className="text-muted-foreground">
                  {practitionerStatus?.isOnline 
                    ? "You'll be notified when guests request sessions"
                    : "Go online to start receiving session requests"}
                </p>
              </CardContent>
            </Card>
          )
        )}
      </main>
    </div>
  );
}