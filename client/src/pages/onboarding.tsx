import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Users, Heart } from 'lucide-react';

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Redirect if already has role
  if (profile?.role) {
    setLocation(profile.role === 'guest' ? '/explore' : '/dashboard');
    return null;
  }

  const selectRole = async (role: 'guest' | 'practitioner') => {
    setLoading(true);
    try {
      await apiRequest('POST', '/api/auth/role-init', { role });
      await refreshProfile();
      toast({ title: `Welcome as a ${role}!` });
      setLocation(role === 'guest' ? '/explore' : '/dashboard');
    } catch (error: any) {
      toast({
        title: 'Failed to set role',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Welcome to Allinya</h1>
          <p className="text-xl text-muted-foreground">How would you like to use the platform?</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover-elevate cursor-pointer transition-all" onClick={() => !loading && selectRole('guest')} data-testid="card-role-guest">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">I'm a Guest</CardTitle>
              <CardDescription className="text-base">
                Looking to connect with a healing practitioner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Browse online practitioners
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Start instant sessions
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Experience live video healing
                </li>
              </ul>
              <Button className="w-full" disabled={loading} data-testid="button-select-guest">
                Continue as Guest
              </Button>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer transition-all" onClick={() => !loading && selectRole('practitioner')} data-testid="card-role-practitioner">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">I'm a Practitioner</CardTitle>
              <CardDescription className="text-base">
                Ready to share my healing practice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Create your profile
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Toggle online/offline
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Connect with guests instantly
                </li>
              </ul>
              <Button className="w-full" disabled={loading} data-testid="button-select-practitioner">
                Continue as Practitioner
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
