import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Heart, User } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

type UserRole = 'guest' | 'practitioner';

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { signIn, signUp, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [rememberEmail, setRememberEmail] = useState(false);

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('allinya_remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberEmail(true);
    }
  }, []);

  // Redirect if already has profile
  useEffect(() => {
    if (profile) {
      if (!profile.role) {
        setLocation('/onboarding');
      } else if (profile.role === 'guest') {
        setLocation('/explore');
      } else {
        setLocation('/profile');
      }
    }
  }, [profile, setLocation]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Save or clear email based on checkbox
      if (rememberEmail) {
        localStorage.setItem('allinya_remembered_email', email);
      } else {
        localStorage.removeItem('allinya_remembered_email');
      }

      await signIn(email, password);
      toast({ title: 'Welcome back!' });
    } catch (error: any) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    
    setLoading(true);

    try {
      await signUp(email, password);
      
      // Initialize role
      await apiRequest('POST', '/api/auth/role-init', { role: selectedRole });
      
      toast({
        title: 'Account created!',
        description: selectedRole === 'guest' 
          ? 'Welcome! You can now explore practitioners.' 
          : 'Welcome! Please complete your practitioner profile.',
      });
    } catch (error: any) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Role selection screen
  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold">Allinya</CardTitle>
            <CardDescription>
              Connect with healing practitioners for instant sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <Card 
              className="cursor-pointer hover-elevate active-elevate-2 transition-all"
              onClick={() => setSelectedRole('guest')}
              data-testid="card-role-guest"
            >
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>I'm a Guest</CardTitle>
                <CardDescription>
                  Looking for healing sessions
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground">
                Browse available practitioners and book instant sessions
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover-elevate active-elevate-2 transition-all"
              onClick={() => setSelectedRole('practitioner')}
              data-testid="card-role-practitioner"
            >
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                  <Heart className="w-8 h-8 text-secondary" />
                </div>
                <CardTitle>I'm a Practitioner</CardTitle>
                <CardDescription>
                  Offering healing services
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground">
                Share your gifts and connect with people seeking healing
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Auth form screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedRole(null)}
            className="w-fit"
            data-testid="button-back"
          >
            ← Back
          </Button>
          <CardTitle className="text-2xl font-bold text-center">
            {selectedRole === 'guest' ? 'Guest Account' : 'Practitioner Account'}
          </CardTitle>
          <CardDescription className="text-center">
            {selectedRole === 'guest' 
              ? 'Find and connect with healing practitioners' 
              : 'Share your healing gifts with those in need'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin" data-testid="tab-signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-signin-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-signin-password"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-email"
                    checked={rememberEmail}
                    onCheckedChange={(checked) => setRememberEmail(checked as boolean)}
                    data-testid="checkbox-remember-email"
                  />
                  <Label
                    htmlFor="remember-email"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Remember my email
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="button-signin">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-signup-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="input-signup-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="button-signup">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    `Sign Up as ${selectedRole === 'guest' ? 'Guest' : 'Practitioner'}`
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
