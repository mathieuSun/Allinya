import { useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Star, Loader2, Clock, User2, ImageIcon, VideoIcon } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { RuntimeProfile } from '@shared/schema';

const DURATION_OPTIONS = [
  { value: 300, label: '5 minutes', minutes: 5 },
  { value: 900, label: '15 minutes', minutes: 15 },
  { value: 1800, label: '30 minutes', minutes: 30 },
  { value: 3600, label: '60 minutes', minutes: 60 },
];

export default function PractitionerProfilePage() {
  const [, params] = useRoute('/p/:id');
  const [, setLocation] = useLocation();
  const { profile: currentUser } = useAuth();
  const { toast } = useToast();
  const [showDurationDialog, setShowDurationDialog] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(300);

  const practitionerId = params?.id;

  // Fetch practitioner profile
  const { data: practitioner, isLoading } = useQuery<RuntimeProfile>({
    queryKey: [`/api/practitioners/${practitionerId}`],
    enabled: !!practitionerId,
  });

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      console.log('Starting session with:', { practitionerId, liveSeconds: selectedDuration });
      const response = await apiRequest('POST', '/api/sessions/start', {
        practitionerId,
        liveSeconds: selectedDuration,
      });
      const data = await response.json();
      console.log('Session created:', data);
      return data;
    },
    onSuccess: (data: any) => {
      console.log('Success! Redirecting to session:', data.sessionId);
      toast({ title: 'Session starting!' });
      setLocation(`/s/${data.sessionId}`);
    },
    onError: (error: any) => {
      console.error('Session creation failed:', error);
      toast({
        title: 'Failed to start session',
        description: error.message || 'Unable to create session. Please try again.',
        variant: 'destructive',
      });
    },
  });

  if (!currentUser) {
    setLocation('/auth');
    return null;
  }

  if (currentUser.role !== 'guest') {
    setLocation('/dashboard');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!practitioner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-muted-foreground">Practitioner not found</p>
      </div>
    );
  }

  const heroImage = practitioner.galleryUrls?.[0] || practitioner.avatarUrl;
  const thumbnails = [
    practitioner.avatarUrl,
    ...(practitioner.galleryUrls || []).slice(0, 3),
  ].filter(Boolean);

  const handleStartClick = () => {
    setShowDurationDialog(true);
  };

  const handleConfirmStart = () => {
    startSessionMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border backdrop-blur-lg bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Allinya</h1>
            <Button variant="outline" onClick={() => setLocation('/explore')} data-testid="button-back">
              Back to Explore
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative h-80 md:h-96">
        {heroImage ? (
          <img src={heroImage} alt={practitioner.displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ImageIcon className="h-24 w-24 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <Avatar className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 h-24 w-24 border-4 border-background">
          {practitioner.avatarUrl ? (
            <AvatarImage src={practitioner.avatarUrl} />
          ) : null}
          <AvatarFallback className="bg-muted">
            <User2 className="h-12 w-12 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Content Section */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 pt-16 pb-24">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-practitioner-name">{practitioner.displayName}</h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="text-lg">4.5 (0)</span>
          </div>
          {practitioner.specialties && practitioner.specialties.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {practitioner.specialties.map((specialty, i) => (
                <Badge key={i} className="bg-primary/10 text-primary" data-testid={`badge-specialty-${i}`}>
                  {specialty}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {practitioner.bio && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">About</h2>
            <p className="text-lg leading-relaxed text-foreground whitespace-pre-wrap" data-testid="text-bio">
              {practitioner.bio}
            </p>
          </div>
        )}

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Gallery</h2>
          {thumbnails.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {thumbnails.map((url, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted" data-testid={`gallery-thumb-${i}`}>
                  <img src={url || undefined} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/10">
              <ImageIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">No images yet</p>
              <p className="text-sm text-muted-foreground/75 text-center mt-2">
                Gallery images will appear here once the practitioner uploads them
              </p>
            </div>
          )}
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Introduction Video</h2>
          {practitioner.videoUrl ? (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              {/* If the URL is a video file, display it */}
              {practitioner.videoUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                <video controls className="w-full h-full">
                  <source src={practitioner.videoUrl} />
                  Your browser does not support the video tag.
                </video>
              ) : (
                /* Otherwise show the URL as a placeholder for now */
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <p className="text-muted-foreground">Video: {practitioner.videoUrl}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 bg-muted/10">
              <VideoIcon className="h-20 w-20 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">No video yet</p>
              <p className="text-sm text-muted-foreground/75 text-center mt-2">
                An introduction video will appear here once uploaded
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border backdrop-blur-lg bg-background/80 p-4">
        <div className="max-w-4xl mx-auto">
          <Button
            size="lg"
            className="w-full text-lg"
            onClick={handleStartClick}
            disabled={startSessionMutation.isPending}
            data-testid="button-start-session"
          >
            {startSessionMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Starting Session...
              </>
            ) : (
              'Start Session'
            )}
          </Button>
        </div>
      </div>

      {/* Duration Selection Dialog */}
      <Dialog open={showDurationDialog} onOpenChange={setShowDurationDialog}>
        <DialogContent data-testid="dialog-duration">
          <DialogHeader>
            <DialogTitle>Select Session Duration</DialogTitle>
            <DialogDescription>Choose how long you'd like your session to be</DialogDescription>
          </DialogHeader>
          <RadioGroup value={selectedDuration.toString()} onValueChange={(val) => setSelectedDuration(Number(val))}>
            <div className="grid grid-cols-2 gap-4 my-6">
              {DURATION_OPTIONS.map((option) => (
                <div key={option.value} className="relative">
                  <RadioGroupItem
                    value={option.value.toString()}
                    id={`duration-${option.value}`}
                    className="peer sr-only"
                    data-testid={`radio-duration-${option.value}`}
                  />
                  <Label
                    htmlFor={`duration-${option.value}`}
                    className="flex flex-col items-center justify-center p-6 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover-elevate"
                  >
                    <Clock className="h-8 w-8 mb-2" />
                    <span className="text-2xl font-semibold">{option.minutes}</span>
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
          <Button
            onClick={handleConfirmStart}
            disabled={startSessionMutation.isPending}
            className="w-full"
            data-testid="button-confirm-duration"
          >
            {startSessionMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              'Confirm & Start'
            )}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
