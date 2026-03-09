import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MapPin, Star, TrendingUp, Clock, Newspaper, CheckCircle, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { timeSince, calculateAverageRating } from '@/lib/utils';
import InkSnapLogo from '@/components/InkSnapLogo';

const devNews = [
  {
    date: 'March 8, 2026',
    title: 'UI Refresh, Logo Fix & Cloudinary Edge Functions',
    description: 'Replaced broken external logo URLs (Hostinger CDN) with an inline SVG InkSnapLogo component — no more missing images. Upgraded the Navbar with desktop navigation links (Search, Feed). Redesigned the HomePage hero section with improved typography, animated badge, glassmorphic search bar, and quick stats row. Created the missing Supabase Edge Functions for Cloudinary image upload (upload-to-cloudinary) and deletion (delete-from-cloudinary) — portfolio image uploads now fully functional once Cloudinary secrets are configured in Supabase.',
  },
  {
    date: 'March 8, 2026',
    title: 'Full Codebase & Database Audit — Major Stability Update',
    description: 'Performed a comprehensive audit and fixed all critical bugs. Key fixes: added missing profileLoading state to AuthContext (was undefined app-wide, breaking all loading guards); replaced blank white screen during auth with a loading spinner; moved Supabase credentials to environment variables; eliminated infinite API fetch loops caused by toast/user in useCallback dependency arrays (now use stable refs); added AbortController to all async data fetches to prevent state updates on unmounted components; fixed form reset race condition in profile settings (now only resets on login/logout, not every profile update); added ProtectedRoute to App.jsx so dashboards and chat redirect to /auth when unauthenticated; fixed null crash in ArtistInfoPanel when bookings prop is undefined; fixed incorrect Supabase FK join syntax on reviews across multiple components; fixed infinite loop in NewsFeedPage caused by isLoading/hasMore in useCallback deps; removed global console.warn suppression from vite.config.js; and rebuilt the entire database schema from scratch with full RLS policies, indexes, RPC functions, and realtime support.',
  },
  {
    date: 'June 20, 2025',
    title: 'Database & Chat Reliability Update',
    description: 'Fixed critical database schema errors by implementing a full schema reset. Corrected chat initiation logic to prevent race conditions and fixed dialog layering issues on the News Feed.',
  },
  {
    date: 'June 19, 2025',
    title: 'Chat System & UI Overhaul',
    description: 'Integrated artist/client info panels into the chat system, added booking history, and fixed various UI bugs related to pop-ups and messaging.',
  },
  {
    date: 'June 18, 2025',
    title: 'Artist Profile Enhancements',
    description: 'Added General Availability settings for artists and now display the next upcoming convention date directly on the artist header for better visibility.',
  },
  {
    date: 'June 17, 2025',
    title: 'Initial UI Polish & Feature Rollout',
    description: 'Implemented a major UI overhaul, enabling global scrolling, smaller component cards, and added the first version of the Deals and Conventions sections.',
  },
];

const whyChooseReasons = [
  "We build alongside artists to bring the best experience.",
  "Regular updates, bug fixes, and active development.",
  "A dedicated platform to connect you with your next masterpiece, commission-free."
];

const HomePage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationTerm, setLocationTerm] = useState('');
  const [featuredArtists, setFeaturedArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();


  useEffect(() => {
    const fetchFeaturedArtists = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, reviews_data:reviews!reviews_artist_id_fkey(stars)')
          .eq('is_artist', true)
          .order('last_active', { ascending: false, nullsFirst: false })
          .limit(6);

        if (error) throw error;
        
        const artistsWithAvgRating = data.map(artist => {
          const ratingInfo = calculateAverageRating(artist.reviews_data);
          return { ...artist, average_rating: ratingInfo.average, review_count: ratingInfo.count };
        });

        setFeaturedArtists(artistsWithAvgRating);
      } catch (error) {
        console.error('Error fetching featured artists:', error);
        toast({ title: "Error", description: error.message || "Could not load featured artists.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeaturedArtists();
  }, [toast]);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/search?query=${encodeURIComponent(searchTerm)}&location=${encodeURIComponent(locationTerm)}`);
  };

  return (
    <div className="min-h-screen">
      <header className="relative py-20 md:py-32 text-center overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 ink-gradient opacity-10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/40 to-background pointer-events-none z-0"></div>
        {/* Decorative blobs */}
        <div className="absolute top-10 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 right-1/4 w-48 h-48 bg-primary/8 rounded-full blur-2xl pointer-events-none"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="container mx-auto px-4 relative z-10"
        >
          {/* Logo badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="w-24 h-24 mx-auto mb-6 ink-gradient rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/30"
          >
            <InkSnapLogo className="w-16 h-16" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6"
          >
            <Zap className="w-3.5 h-3.5" /> Find your next ink, commission-free
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Discover Your Next<br />
            <span className="ink-text-gradient">Masterpiece</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Connect with talented tattoo artists, explore stunning portfolios, and book your next ink session with InkSnap.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-10">
            <div className="flex flex-col md:flex-row gap-3 p-2 glass-effect rounded-2xl border border-border/60 shadow-xl shadow-black/30">
              <div className="flex items-center flex-1 gap-2 px-3">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  type="text"
                  placeholder="Style, artist, or keyword..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-10 px-0 text-base"
                />
              </div>
              <div className="hidden md:block w-px bg-border/50 my-1"></div>
              <div className="flex items-center flex-1 gap-2 px-3">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  type="text"
                  placeholder="City, State..."
                  value={locationTerm}
                  onChange={(e) => setLocationTerm(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-10 px-0 text-base"
                />
              </div>
              <Button type="submit" className="ink-gradient h-10 px-6 rounded-xl shrink-0">
                Search
              </Button>
            </div>
          </form>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-8 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-400 fill-current" /> Top-rated artists</span>
            <span className="hidden sm:flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> Locations nationwide</span>
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> Commission-free</span>
          </motion.div>
        </motion.div>
      </header>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 mr-3 text-primary" /> Featured Artists
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Check out some of the most active and highly-rated artists on InkSnap.
            </p>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="glass-effect rounded-xl p-6 animate-pulse">
                  <div className="flex items-center mb-4"><div className="w-16 h-16 bg-muted rounded-full mr-4"></div><div><div className="h-6 w-32 bg-muted rounded mb-1"></div><div className="h-4 w-24 bg-muted rounded"></div></div></div><div className="h-4 w-full bg-muted rounded mb-2"></div><div className="h-4 w-3/4 bg-muted rounded mb-4"></div><div className="flex justify-between items-center"><div className="h-5 w-20 bg-muted rounded"></div><div className="h-8 w-24 bg-muted rounded-full"></div></div>
                </div>
              ))}
            </div>
          ) : featuredArtists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredArtists.map((artist, index) => (
                <motion.div key={artist.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 + 0.3 }} className="h-full">
                  <Link to={`/artist/${artist.username}`} className="block group h-full">
                    <div className="glass-effect rounded-xl overflow-hidden h-full flex flex-col relative">
                       {artist.location_thumbnail_url && (<div className="absolute inset-0 bg-cover bg-center opacity-15 group-hover:opacity-25 transition-opacity duration-300" style={{ backgroundImage: `url(${artist.location_thumbnail_url})` }}></div>)}
                      <div className="p-5 flex-grow flex flex-col z-10 bg-card/50 group-hover:bg-card/30 transition-colors duration-300">
                        <div className="flex items-center mb-3">
                          <Avatar className="w-16 h-16 mr-4 border-2 border-primary/50"><AvatarImage src={artist.profile_photo_url} alt={artist.name} /><AvatarFallback className="ink-gradient text-primary-foreground">{artist.name?.charAt(0)?.toUpperCase() || 'A'}</AvatarFallback></Avatar>
                          <div><h3 className="text-xl font-semibold group-hover:text-primary transition-colors">{artist.name}</h3><p className="text-sm text-muted-foreground">@{artist.username}</p></div>
                        </div>
                        {artist.location && <div className="flex items-center text-sm text-muted-foreground mb-1"><MapPin className="w-4 h-4 mr-2 text-foreground" /><span>{artist.location}</span></div>}
                        <p className="text-sm text-foreground/90 line-clamp-2 mb-3 flex-grow">{artist.bio || "No bio available."}</p>
                        {artist.styles?.length > 0 && <div className="flex flex-wrap gap-1 mb-3">{artist.styles.slice(0, 3).map(style => <span key={style} className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">{style}</span>)}</div>}
                        <div className="mt-auto border-t border-border/30 pt-3">
                          <div className="flex items-center justify-between text-sm"><div className="flex items-center"><Star className="w-4 h-4 text-yellow-400 fill-current mr-1" /><span>{artist.average_rating > 0 ? artist.average_rating : 'N/A'} ({artist.review_count} reviews)</span></div>{artist.booking_status ? <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">Available</span> : <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full">Booked</span>}</div>
                           {timeSince(artist.last_active) && <div className="flex items-center text-xs text-muted-foreground mt-2"><Clock className="w-3 h-3 mr-1.5 text-foreground" />Active: {timeSince(artist.last_active)}</div>}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (<p className="text-center text-muted-foreground">No featured artists available at the moment.</p>)}
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="glass-effect rounded-2xl p-8"
            >
                <h2 className="text-2xl font-bold text-center mb-8 ink-text-gradient">Developer Zone</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                        <h3 className="text-xl font-semibold mb-4 flex items-center"><Newspaper className="w-5 h-5 mr-2 text-primary" /> Dev News & Updates</h3>
                        <div className="space-y-4">
                            {devNews.map((item, index) => (
                                <div key={index} className="border-l-2 border-primary pl-4">
                                    <p className="text-xs text-muted-foreground">{item.date}</p>
                                    <p className="font-semibold">{item.title}</p>
                                    <p className="text-sm text-foreground/80">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold mb-4">Why Choose InkSnap?</h3>
                         <ul className="space-y-3">
                            {whyChooseReasons.map((reason, index) => (
                                <li key={index} className="flex items-start">
                                    <CheckCircle className="w-5 h-5 mr-3 mt-0.5 text-green-400 flex-shrink-0" />
                                    <span>{reason}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
