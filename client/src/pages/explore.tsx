import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Loader2, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getPractitionerStatusText, getPractitionerStatusStyle, isPractitionerAvailable } from '@/lib/practitioner-utils';
import type { PractitionerWithProfile } from '@shared/schema';

export default function ExplorePage() {
  const [, setLocation] = useLocation();
  const { profile, signOut } = useAuth();

  // Fetch all practitioners (online and offline) with automatic polling
  const { data: practitioners, isLoading } = useQuery<PractitionerWithProfile[]>({
    queryKey: ['/api/practitioners'],
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchIntervalInBackground: false, // Only poll when page is visible/focused
  });

  // Subscribe to realtime updates
  useEffect(() => {

    const channel = supabase
      .channel('practitioners-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'practitioners',
        },
        () => {
          // Invalidate cache to trigger refetch when practitioners table changes
          queryClient.invalidateQueries({ queryKey: ['/api/practitioners'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!profile) {
    setLocation('/auth');
    return null;
  }

  if (profile.role === 'practitioner') {
    setLocation('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border backdrop-blur-lg bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Allinya</h1>
            <div className="flex items-center gap-4">
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
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Practitioners</h2>
          <p className="text-xl text-muted-foreground">
            Connect with healing practitioners • Online practitioners shown in full color
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !practitioners || practitioners.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">No practitioners available</p>
            <p className="text-sm text-muted-foreground mt-2">Please check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {practitioners.map((practitioner) => {
              const isOnline = practitioner.isOnline;
              const isInService = practitioner.inService;
              const isAvailable = isPractitionerAvailable(isOnline, isInService);
              const statusText = getPractitionerStatusText(isOnline, isInService);
              const statusStyle = getPractitionerStatusStyle(isOnline, isInService);
              
              return (
              <Card
                key={practitioner.userId}
                className={`hover-elevate transition-all cursor-pointer overflow-hidden ${
                  isInService ? 'ring-2 ring-blue-500' : !isOnline ? 'opacity-50 grayscale' : ''
                }`}
                onClick={() => setLocation(`/p/${practitioner.userId}`)}
                data-testid={`card-practitioner-${practitioner.userId}`}
              >
                <div className="aspect-[3/4] relative">
                  {practitioner.profile.avatarUrl ? (
                    <img
                      src={practitioner.profile.avatarUrl}
                      alt={practitioner.profile.displayName}
                      className={`w-full h-full object-cover ${isInService ? 'saturate-150' : ''}`}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Avatar className="h-32 w-32">
                        <AvatarFallback className="text-4xl">
                          {practitioner.profile.displayName?.[0]?.toUpperCase() || 'P'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-4 right-4">
                    <Badge 
                      className={`${statusStyle.badgeClass} ${isInService ? 'animate-pulse' : ''}`} 
                      data-testid={`badge-status-${practitioner.userId}`}
                    >
                      {statusText}
                    </Badge>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-2xl font-semibold mb-2" data-testid={`text-practitioner-name-${practitioner.userId}`}>
                      {practitioner.profile.displayName}
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="ml-1 text-sm">
                          5.0 ({practitioner.reviewCount || 0})
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {practitioner.profile.specialties?.slice(0, 3).map((specialty, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="bg-white/20 text-white border-white/30"
                          data-testid={`badge-specialty-${i}`}
                        >
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <Button 
                    className={`w-full ${isInService ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                    disabled={!isAvailable}
                    data-testid={`button-start-${practitioner.userId}`}
                  >
                    {isAvailable ? 'Start Session' : statusText}
                  </Button>
                </CardContent>
              </Card>
            );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
