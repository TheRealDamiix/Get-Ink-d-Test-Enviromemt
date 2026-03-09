import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, LayoutDashboard, Newspaper, MessageCircle, Loader2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import InkSnapLogo from '@/components/InkSnapLogo';

const Navbar = () => {
  const { user, logout, loading, profileLoading, unreadCount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 0 || parts[0] === '') return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase();
  }
  
  const isArtist = user?.is_artist ?? user?.profile?.is_artist ?? false;
  const profilePhoto = user?.profile_photo_url ?? user?.profile?.profile_photo_url;
  const displayName = user?.name ?? user?.profile?.name;
  const username = user?.username ?? user?.profile?.username;
  const isUserLoading = loading || profileLoading;

  const navLinkClass = (path) =>
    `text-sm font-medium transition-colors hover:text-primary ${
      location.pathname === path ? 'text-primary' : 'text-muted-foreground'
    }`;

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 glass-effect border-b border-border/50"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 shrink-0">
            <InkSnapLogo className="w-9 h-9" />
            <span className="text-xl font-bold ink-text-gradient hidden sm:block">InkSnap</span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/search" className={navLinkClass('/search')}>
              <span className="flex items-center gap-1.5"><Search className="w-3.5 h-3.5" />Search</span>
            </Link>
            <Link to="/feed" className={navLinkClass('/feed')}>
              <span className="flex items-center gap-1.5"><Newspaper className="w-3.5 h-3.5" />Feed</span>
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-3">
            {isUserLoading ? (
               <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profilePhoto} alt={displayName || 'User Avatar'} />
                      <AvatarFallback className="ink-gradient text-primary-foreground">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">{unreadCount}</Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 glass-effect" align="end">
                  <DropdownMenuItem asChild>
                    <Link to={isArtist ? "/artist-dashboard" : "/client-dashboard"} className="flex items-center">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/feed" className="flex items-center">
                      <Newspaper className="mr-2 h-4 w-4" /> <span>Feed</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/chat" className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <MessageCircle className="mr-2 h-4 w-4" /> <span>Messages</span>
                      </div>
                      {unreadCount > 0 && <Badge variant="destructive" className="h-auto">{unreadCount}</Badge>}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" asChild size="sm" className="hidden sm:inline-flex"><Link to="/feed">Feed</Link></Button>
                <Button asChild className="ink-gradient hover:opacity-90"><Link to="/auth">Sign In</Link></Button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
