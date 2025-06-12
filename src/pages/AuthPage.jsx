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
import { Palette, User, Mail, Lock, MapPin } from 'lucide-react';

const AuthPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [signupForm, setSignupForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    isArtist: false,
    location: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const users = JSON.parse(localStorage.getItem('inklink_users') || '[]');
      const user = users.find(u => u.email === loginForm.email && u.password === loginForm.password);

      if (user) {
        user.lastActive = new Date().toISOString();
        const userIndex = users.findIndex(u => u.id === user.id);
        users[userIndex] = user;
        localStorage.setItem('inklink_users', JSON.stringify(users));

        login(user);
        toast({
          title: "Welcome back!",
          description: "You've been successfully logged in.",
        });
        navigate(user.isArtist ? '/artist-dashboard' : '/client-dashboard');
      } else {
        toast({
          title: "Login failed",
          description: "Invalid email or password.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const users = JSON.parse(localStorage.getItem('inklink_users') || '[]');
      
      if (users.some(u => u.email === signupForm.email)) {
        toast({
          title: "Email already exists",
          description: "Please use a different email address.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      if (users.some(u => u.username === signupForm.username)) {
        toast({
          title: "Username already exists",
          description: "Please choose a different username.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      const newUser = {
        id: Date.now().toString(),
        ...signupForm,
        profilePhoto: '',
        bio: '',
        styles: [],
        bookingStatus: false,
        bookedUntil: null,
        bookingLink: '',
        portfolio: [],
        followers: [],
        lastActive: new Date().toISOString()
      };

      users.push(newUser);
      localStorage.setItem('inklink_users', JSON.stringify(users));

      login(newUser);
      toast({
        title: "Account created!",
        description: "Welcome to InkSnap! Your account has been created successfully.",
      });
      navigate(newUser.isArtist ? '/artist-dashboard' : '/client-dashboard');
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 ink-gradient opacity-5"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-effect rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 ink-gradient rounded-2xl flex items-center justify-center">
              <Palette className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold ink-text-gradient">InkSnap</h1>
            <p className="text-muted-foreground mt-2">Join the tattoo community</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full ink-gradient" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={signupForm.name}
                      onChange={(e) => setSignupForm({...signupForm, name: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="Choose a username"
                      value={signupForm.username}
                      onChange={(e) => setSignupForm({...signupForm, username: e.target.value})}
                      className="pl-8"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({...signupForm, email: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({...signupForm, password: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signup-location"
                      type="text"
                      placeholder="City, State"
                      value={signupForm.location}
                      onChange={(e) => setSignupForm({...signupForm, location: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-artist"
                    checked={signupForm.isArtist}
                    onCheckedChange={(checked) => setSignupForm({...signupForm, isArtist: checked})}
                  />
                  <Label htmlFor="is-artist" className="text-sm">
                    I'm a tattoo artist
                  </Label>
                </div>

                <Button type="submit" className="w-full ink-gradient" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;