import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PractitionerWithProfile } from '@shared/schema';

export default function ExplorePage() {
  const [, setLocation] = useLocation();
  const { profile } = useAuth();
  const [onlinePractitioners, setOnlinePractitioners] = useState<PractitionerWithProfile[]>([]);

  // Fetch online practitioners
  const { data: practitioners, isLoading } = useQuery<PractitionerWithProfile[]>({
    queryKey: ['/api/practitioners/online'],
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (practitioners) {
      setOnlinePractitioners(practitioners);
    }

    const channel = supabase
      .channel('practitioners-online')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'practitioners',
        },
        async () => {
          // Refetch when practitioners table changes
          const response = await fetch('/api/practitioners/online');
          if (response.ok) {
            const data = await response.json();
            setOnlinePractitioners(data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [practitioners]);

  if (!profile) {
    setLocation('/auth');
    return null;
  }

  if (profile.role === 'practitioner') {
    setLocation('/profile');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border backdrop-blur-lg bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Allinya</h1>
            <Button variant="outline" onClick={() => setLocation('/profile')} data-testid="button-profile">
              My Profile
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Online Practitioners</h2>
          <p className="text-xl text-muted-foreground">
            Connect with available practitioners for an instant healing session
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : onlinePractitioners.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">No practitioners are currently online</p>
            <p className="text-sm text-muted-foreground mt-2">Please check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {onlinePractitioners.map((practitioner) => (
              <Card
                key={practitioner.userId}
                className="hover-elevate transition-all cursor-pointer overflow-hidden"
                onClick={() => setLocation(`/p/${practitioner.userId}`)}
                data-testid={`card-practitioner-${practitioner.userId}`}
              >
                <div className="aspect-[3/4] relative">
                  {practitioner.profile.avatarUrl ? (
                    <img
                      src={practitioner.profile.avatarUrl}
                      alt={practitioner.profile.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Avatar className="h-32 w-32">
                        <AvatarFallback className="text-4xl">
                          {practitioner.profile.displayName[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-2xl font-semibold mb-2" data-testid={`text-practitioner-name-${practitioner.userId}`}>
                      {practitioner.profile.displayName}
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="ml-1 text-sm">
                          {Number(practitioner.rating).toFixed(1)} ({practitioner.reviewCount})
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
                  <Button className="w-full" data-testid={`button-start-${practitioner.userId}`}>
                    Start Session
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
