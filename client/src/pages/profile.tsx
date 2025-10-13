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
import { Loader2, Plus, X, Power, PowerOff, LogOut, Upload, ImageIcon, VideoIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ObjectUploader } from '@/components/ObjectUploader';
import type { UploadResult } from '@uppy/core';

const guestProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  country: z.string().optional(),
  avatarUrl: z.string().optional(),
});

const practitionerProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  specialties: z.array(z.string()).max(4, 'Maximum 4 specialties allowed'),
  avatarUrl: z.string().optional(),
  galleryUrls: z.array(z.string()).max(3, 'Maximum 3 gallery images allowed'),
  videoUrl: z.string().optional(),
});

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { profile, user, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedGalleryUrls, setUploadedGalleryUrls] = useState<string[]>([]);
  const [currentUploadPublicPath, setCurrentUploadPublicPath] = useState<string | null>(null);
  const [currentGalleryPublicPaths, setCurrentGalleryPublicPaths] = useState<string[]>([]);

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
      const isOnline = (practitionerStatus as any)?.online;
      toast({ title: isOnline ? 'You are now offline' : 'You are now online' });
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

  // Only reset form values when component first mounts with profile data
  // No need for useEffect - form initializes with profile data already

  useEffect(() => {
    if (!profile || !user) {
      setLocation('/auth');
    } else if (!profile.role) {
      setLocation('/onboarding');
    }
  }, [profile, user, setLocation]);

  if (!profile || !user) {
    return null;
  }

  if (!profile.role) {
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
    // Removed - using file upload instead
  };

  const removeGalleryUrl = (index: number) => {
    const current = form.getValues('galleryUrls') || [];
    form.setValue(
      'galleryUrls',
      current.filter((_, i) => i !== index)
    );
  };

  // File upload handlers
  const handleGetUploadParametersForAvatar = async () => {
    const response = await fetch('/api/objects/upload-public', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await response.json();
    setCurrentUploadPublicPath(data.publicPath);
    return { method: 'PUT' as const, url: data.uploadURL };
  };

  const handleGetUploadParametersForVideo = async () => {
    const response = await fetch('/api/objects/upload-public', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await response.json();
    setCurrentUploadPublicPath(data.publicPath);
    return { method: 'PUT' as const, url: data.uploadURL };
  };

  const handleGetUploadParametersForGallery = async () => {
    const response = await fetch('/api/objects/upload-public', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await response.json();
    setCurrentGalleryPublicPaths(prev => [...prev, data.publicPath]);
    return { method: 'PUT' as const, url: data.uploadURL };
  };

  const handleAvatarUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0 && currentUploadPublicPath) {
      const response: any = await apiRequest('PUT', '/api/profile/avatar', {
        publicPath: currentUploadPublicPath,
      });
      
      setUploadedAvatarUrl(response.avatarUrl);
      form.setValue('avatarUrl', response.avatarUrl);
      setCurrentUploadPublicPath(null);
      await refreshProfile();
      
      toast({
        title: 'Avatar uploaded successfully',
      });
    }
  };

  const handleVideoUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0 && currentUploadPublicPath) {
      const response: any = await apiRequest('PUT', '/api/profile/video', {
        publicPath: currentUploadPublicPath,
      });
      
      setUploadedVideoUrl(response.videoUrl);
      form.setValue('videoUrl', response.videoUrl);
      setCurrentUploadPublicPath(null);
      await refreshProfile();
      
      toast({
        title: 'Video uploaded successfully',
      });
    }
  };

  const handleGalleryUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0 && currentGalleryPublicPaths.length > 0) {
      const response: any = await apiRequest('PUT', '/api/profile/gallery', {
        galleryPaths: currentGalleryPublicPaths,
      });
      
      setUploadedGalleryUrls(response.galleryUrls);
      form.setValue('galleryUrls', response.galleryUrls);
      setCurrentGalleryPublicPaths([]);
      await refreshProfile();
      
      toast({
        title: 'Gallery images uploaded successfully',
      });
    }
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
                  variant={(practitionerStatus as any)?.online ? 'default' : 'outline'}
                  onClick={() => toggleOnlineMutation.mutate(!(practitionerStatus as any)?.online)}
                  disabled={toggleOnlineMutation.isPending}
                  data-testid="button-toggle-online"
                >
                  {(practitionerStatus as any)?.online ? (
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
                  try {
                    await signOut();
                    // Navigation will be handled by auth state listener
                  } catch (error: any) {
                    toast({
                      title: 'Logout failed',
                      description: error.message,
                      variant: 'destructive',
                    });
                  }
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
                    <AvatarImage src={uploadedAvatarUrl || form.watch('avatarUrl')} />
                    <AvatarFallback className="text-2xl">
                      {profile.displayName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="space-y-2">
                      <Label>Avatar Picture</Label>
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={5242880} // 5MB
                        allowedFileTypes={['image/*', '.jpg', '.jpeg', '.png', '.gif', '.webp']}
                        onGetUploadParameters={handleGetUploadParametersForAvatar}
                        onComplete={handleAvatarUpload}
                      >
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          <span>Upload Avatar from Computer</span>
                        </div>
                      </ObjectUploader>
                      {(uploadedAvatarUrl || form.watch('avatarUrl')) && (
                        <p className="text-sm text-muted-foreground">Current avatar uploaded</p>
                      )}
                    </div>
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
                      <ObjectUploader
                        maxNumberOfFiles={3}
                        maxFileSize={5242880} // 5MB
                        allowedFileTypes={['image/*', '.jpg', '.jpeg', '.png', '.gif', '.webp']}
                        onGetUploadParameters={handleGetUploadParametersForGallery}
                        onComplete={handleGalleryUpload}
                      >
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          <span>Upload Gallery Images from Computer</span>
                        </div>
                      </ObjectUploader>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        {(uploadedGalleryUrls.length > 0 ? uploadedGalleryUrls : form.watch('galleryUrls') || []).map((url, index) => (
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

                    <div className="space-y-2">
                      <Label>Introduction Video (optional)</Label>
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={104857600} // 100MB for videos
                        allowedFileTypes={['video/*', '.mp4', '.mov', '.avi', '.mkv', '.webm']}
                        onGetUploadParameters={handleGetUploadParametersForVideo}
                        onComplete={handleVideoUpload}
                      >
                        <div className="flex items-center gap-2">
                          <VideoIcon className="h-4 w-4" />
                          <span>Upload Video from Computer</span>
                        </div>
                      </ObjectUploader>
                      {(uploadedVideoUrl || form.watch('videoUrl')) && (
                        <p className="text-sm text-muted-foreground">Video uploaded successfully</p>
                      )}
                    </div>
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
