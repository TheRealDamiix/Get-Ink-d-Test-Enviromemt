import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 glass-effect border-b border-border/50"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img src="https://storage.googleapis.com/hostinger-horizons-assets-prod/dc3f6a73-e4ae-4a98-96ee-f971fdcf05b8/8bf17520f8ce5aa9c389b6e905e8e58b.jpg" alt="InkSnap Logo" className="w-10 h-10 rounded-lg object-cover" />
            <span className="text-xl font-bold ink-text-gradient">InkSnap</span>
          </Link>

          <div className="flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      {/* Use user.profile_photo_url consistently */}
                      <AvatarImage src={user.profile_photo_url} alt={user.name} />
                      <AvatarFallback className="ink-gradient text-white">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 glass-effect" align="end">
                  <DropdownMenuItem asChild>
                    {/* Use user.is_artist consistently */}
                    <Link to={user.is_artist ? "/artist-dashboard" : "/client-dashboard"} className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  {/* Use user.is_artist consistently */}
                  {user.is_artist && (
                    <DropdownMenuItem asChild>
                      <Link to={`/artist/${user.username}`} className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        View Profile
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild className="ink-gradient hover:opacity-90">
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
