import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, X, Power, PowerOff, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery, useMutation } from '@tanstack/react-query';

const guestProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  country: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

const practitionerProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  specialties: z.array(z.string()).max(4, 'Maximum 4 specialties allowed'),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  galleryUrls: z.array(z.string().url()).max(3, 'Maximum 3 gallery images allowed'),
  videoUrl: z.string().url().optional().or(z.literal('')),
});

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { profile, user, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [galleryInput, setGalleryInput] = useState('');

  // Fetch practitioner status if applicable
  const { data: practitionerStatus } = useQuery({
    queryKey: ['/api/practitioners/status'],
    enabled: profile?.role === 'practitioner',
  });

  // Toggle online status
  const toggleOnlineMutation = useMutation({
    mutationFn: async (online: boolean) => {
      return apiRequest('POST', '/api/presence/toggle', { online });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/practitioners/status'] });
      toast({ title: practitionerStatus?.online ? 'You are now offline' : 'You are now online' });
    },
  });

  const schema = profile?.role === 'practitioner' ? practitionerProfileSchema : guestProfileSchema;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: profile?.displayName || '',
      country: profile?.country || '',
      bio: profile?.bio || '',
      specialties: profile?.specialties || [],
      avatarUrl: profile?.avatarUrl || '',
      galleryUrls: profile?.galleryUrls || [],
      videoUrl: profile?.videoUrl || '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        displayName: profile.displayName || '',
        country: profile.country || '',
        bio: profile.bio || '',
        specialties: profile.specialties || [],
        avatarUrl: profile.avatarUrl || '',
        galleryUrls: profile.galleryUrls || [],
        videoUrl: profile.videoUrl || '',
      });
    }
  }, [profile]);

  if (!profile || !user) {
    setLocation('/auth');
    return null;
  }

  if (!profile.role) {
    setLocation('/onboarding');
    return null;
  }

  const onSubmit = async (data: any) => {
    try {
      await apiRequest('PUT', '/api/profile', data);
      await refreshProfile();
      toast({ title: 'Profile updated successfully!' });
    } catch (error: any) {
      toast({
        title: 'Failed to update profile',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const addSpecialty = () => {
    const current = form.getValues('specialties') || [];
    if (specialtyInput.trim() && current.length < 4) {
      form.setValue('specialties', [...current, specialtyInput.trim()]);
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (index: number) => {
    const current = form.getValues('specialties') || [];
    form.setValue(
      'specialties',
      current.filter((_, i) => i !== index)
    );
  };

  const addGalleryUrl = () => {
    const current = form.getValues('galleryUrls') || [];
    if (galleryInput.trim() && current.length < 3) {
      form.setValue('galleryUrls', [...current, galleryInput.trim()]);
      setGalleryInput('');
    }
  };

  const removeGalleryUrl = (index: number) => {
    const current = form.getValues('galleryUrls') || [];
    form.setValue(
      'galleryUrls',
      current.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border backdrop-blur-lg bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Allinya</h1>
            <div className="flex items-center gap-4">
              {profile.role === 'guest' && (
                <Button variant="outline" onClick={() => setLocation('/explore')} data-testid="button-explore">
                  Explore Practitioners
                </Button>
              )}
              {profile.role === 'practitioner' && (
                <Button
                  variant={practitionerStatus?.online ? 'default' : 'outline'}
                  onClick={() => toggleOnlineMutation.mutate(!practitionerStatus?.online)}
                  disabled={toggleOnlineMutation.isPending}
                  data-testid="button-toggle-online"
                >
                  {practitionerStatus?.online ? (
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
              )}
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

      <main className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">
              {profile.role === 'practitioner' ? 'Practitioner Profile' : 'Guest Profile'}
            </CardTitle>
            <CardDescription>
              {profile.role === 'practitioner'
                ? 'Your profile helps guests connect with you'
                : 'Update your information'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center gap-6 mb-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={form.watch('avatarUrl')} />
                    <AvatarFallback className="text-2xl">
                      {profile.displayName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="avatarUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avatar URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/avatar.jpg" {...field} data-testid="input-avatar-url" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} data-testid="input-display-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {profile.role === 'guest' && (
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="Your country" {...field} data-testid="input-country" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {profile.role === 'practitioner' && (
                  <>
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell guests about your practice and approach..."
                              rows={6}
                              {...field}
                              data-testid="input-bio"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>Specialties (max 4)</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a specialty"
                          value={specialtyInput}
                          onChange={(e) => setSpecialtyInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                          data-testid="input-specialty"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addSpecialty}
                          disabled={(form.watch('specialties') || []).length >= 4}
                          data-testid="button-add-specialty"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(form.watch('specialties') || []).map((specialty, index) => (
                          <Badge key={index} variant="secondary" className="pl-3 pr-1" data-testid={`badge-specialty-${index}`}>
                            {specialty}
                            <button
                              type="button"
                              onClick={() => removeSpecialty(index)}
                              className="ml-2 hover-elevate rounded-full p-1"
                              data-testid={`button-remove-specialty-${index}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Gallery Images (max 3)</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://example.com/image.jpg"
                          value={galleryInput}
                          onChange={(e) => setGalleryInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGalleryUrl())}
                          data-testid="input-gallery-url"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addGalleryUrl}
                          disabled={(form.watch('galleryUrls') || []).length >= 3}
                          data-testid="button-add-gallery"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        {(form.watch('galleryUrls') || []).map((url, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border" data-testid={`gallery-image-${index}`}>
                            <img src={url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeGalleryUrl(index)}
                              className="absolute top-2 right-2 bg-background/80 hover-elevate rounded-full p-1"
                              data-testid={`button-remove-gallery-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="videoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Video URL (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://youtube.com/..." {...field} data-testid="input-video-url" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <Button type="submit" disabled={form.formState.isSubmitting} data-testid="button-save-profile">
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
