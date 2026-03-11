
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { User, Mail, Lock } from 'lucide-react';
import InkSnapLogo from '@/components/InkSnapLogo';
import LocationAutocomplete from '@/components/ui/LocationAutocomplete';
import type { PageMeta } from '@/types';

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface SignupForm {
  name: string;
  username: string;
  email: string;
  password: string;
  isArtist: boolean;
  location: string;
}

const AuthPage = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { login, signup, user, profileLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Navigate once auth state resolves — avoids racing with onAuthStateChange
  React.useEffect(() => {
    if (user && !profileLoading) {
      navigate(user.is_artist ? '/artist-dashboard' : '/client-dashboard', { replace: true });
    }
  }, [user, profileLoading, navigate]);

  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [signupForm, setSignupForm] = useState<SignupForm>({
    name: '',
    username: '',
    email: '',
    password: '',
    isArtist: false,
    location: ''
  });

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await login(loginForm.email, loginForm.password);

    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      setIsLoading(false);
    }
    // On success: onAuthStateChange fires, sets user in context, useEffect above navigates.
    // Don't call navigate() here — user isn't in context yet and ProtectedRoute would
    // redirect back to /auth before the profile fetch completes.
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const { name, username, email, password, isArtist, location } = signupForm;

    const metadata: Record<string, unknown> = {
      name,
      username,
      is_artist: isArtist,
      location,
      profile_photo_url: null
    };

    const { data, error } = await signup(email, password, metadata);

    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      setIsLoading(false);
    } else {
      toast({ title: "Account created!", description: "Welcome to InkSnap!" });
      // Navigation handled by useEffect once user is set in context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-primary/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 ink-gradient opacity-[0.04] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Card */}
        <div className="rounded-2xl overflow-hidden border border-primary/10 shadow-2xl shadow-black/50"
             style={{ background: 'rgba(18,18,18,0.85)', backdropFilter: 'blur(20px)' }}>
          {/* Top red accent bar */}
          <div className="h-0.5 w-full ink-gradient" />

          <div className="p-8 md:p-10">
            {/* Brand header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 ink-gradient rounded-xl flex items-center justify-center shadow-xl shadow-primary/30">
                <InkSnapLogo className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight ink-text-gradient">InkSnap</h1>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-7 bg-white/5">
                <TabsTrigger value="login" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-medium">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-medium">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50 w-4 h-4" />
                      <Input id="login-email" type="email" placeholder="you@example.com"
                        value={loginForm.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginForm({...loginForm, email: e.target.value})}
                        className="pl-10 bg-white/5 border-white/10 focus:border-primary/50" required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50 w-4 h-4" />
                      <Input id="login-password" type="password" placeholder="••••••••"
                        value={loginForm.password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginForm({...loginForm, password: e.target.value})}
                        className="pl-10 bg-white/5 border-white/10 focus:border-primary/50" required />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox id="remember-me" checked={loginForm.rememberMe}
                      onCheckedChange={(checked: boolean | 'indeterminate') => setLoginForm({...loginForm, rememberMe: !!checked})} />
                    <Label htmlFor="remember-me" className="text-sm font-normal text-muted-foreground cursor-pointer">Remember me</Label>
                  </div>

                  <Button type="submit" className="w-full ink-gradient mt-2 h-11 font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-name" className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50 w-4 h-4" />
                        <Input id="signup-name" type="text" placeholder="Jane Doe"
                          value={signupForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignupForm({...signupForm, name: e.target.value})}
                          className="pl-10 bg-white/5 border-white/10 focus:border-primary/50" required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-username" className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Username</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50 text-sm font-medium">@</span>
                        <Input id="signup-username" type="text" placeholder="janedoe"
                          value={signupForm.username} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignupForm({...signupForm, username: e.target.value})}
                          className="pl-8 bg-white/5 border-white/10 focus:border-primary/50" required />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50 w-4 h-4" />
                      <Input id="signup-email" type="email" placeholder="you@example.com"
                        value={signupForm.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignupForm({...signupForm, email: e.target.value})}
                        className="pl-10 bg-white/5 border-white/10 focus:border-primary/50" required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50 w-4 h-4" />
                      <Input id="signup-password" type="password" placeholder="••••••••"
                        value={signupForm.password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignupForm({...signupForm, password: e.target.value})}
                        className="pl-10 bg-white/5 border-white/10 focus:border-primary/50" required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-location" className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Location</Label>
                    <LocationAutocomplete
                      id="signup-location"
                      value={signupForm.location}
                      onChange={(val: string) => setSignupForm({ ...signupForm, location: val })}
                      placeholder="City, State"
                      inputClassName="bg-white/5 border-white/10 focus:border-primary/50"
                    />
                  </div>

                  <div className="flex items-center space-x-2 py-1 px-3 rounded-lg bg-primary/5 border border-primary/15">
                    <Checkbox id="is-artist" checked={signupForm.isArtist}
                      onCheckedChange={(checked: boolean | 'indeterminate') => setSignupForm({...signupForm, isArtist: !!checked})} />
                    <Label htmlFor="is-artist" className="text-sm cursor-pointer">I'm a tattoo artist</Label>
                  </div>

                  <Button type="submit" className="w-full ink-gradient h-11 font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;

export const meta: PageMeta = {
  title: 'Sign In | InkSnap',
  description: 'Sign in or create your InkSnap account.',
};
