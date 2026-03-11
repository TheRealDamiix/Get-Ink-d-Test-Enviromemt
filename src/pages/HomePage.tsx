import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MapPin, Star, TrendingUp, Clock, Newspaper, CheckCircle, Zap, ArrowRight, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { timeSince, calculateAverageRating } from '@/lib/utils';
import InkSnapLogo from '@/components/InkSnapLogo';
import type { PageMeta, Profile } from '@/types';

interface FeaturedArtist extends Profile {
  average_rating: number;
  review_count: number;
  reviews_data?: Array<{ stars: number }>;
}

interface DevNewsItem {
  date: string;
  title: string;
  description: string;
}

const devNews: DevNewsItem[] = [
  {
    date: 'March 11, 2026',
    title: 'TypeScript Migration, Vite 6 & Performance Improvements',
    description: 'Full TypeScript migration across all 60+ source files (strict mode, 0 errors). Upgraded Vite 4 → 6 with ESM __dirname fix. Added complete Supabase DB type definitions and Next.js App Router–ready structure. Fixed slow/stuck initial load: auth state now unblocks immediately with background profile fetch. Fixed persistent Navbar spinner and added 15-second timeout on featured artist loading.',
  },
  {
    date: 'March 8, 2026',
    title: 'Full Audit, UI Revamp & Cloudinary Integration',
    description: 'Comprehensive codebase and database audit with all critical bugs fixed. Added missing profileLoading to AuthContext; eliminated infinite API fetch loops via stable refs and AbortControllers; fixed form reset race condition; added ProtectedRoute for auth-gated pages; fixed FK join syntax across components; rebuilt full DB schema with RLS, indexes, and realtime. UI revamp: replaced broken logo URLs with inline SVG component, redesigned hero and all major pages with editorial typography and glassmorphic cards, added desktop nav links, modernized Auth/Search/Feed pages. Created Supabase Edge Functions for Cloudinary image upload and deletion — portfolio uploads now fully functional.',
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

const whyChooseReasons: string[] = [
  "We build alongside artists to bring the best experience.",
  "Regular updates, bug fixes, and active development.",
  "A dedicated platform to connect clients directly with the artists behind their vision."
];

const HomePage = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [locationTerm, setLocationTerm] = useState<string>('');
  const [featuredArtists, setFeaturedArtists] = useState<FeaturedArtist[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { toast } = useToast();


  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    const fetchFeaturedArtists = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, reviews_data:reviews!reviews_artist_id_fkey(stars)')
          .eq('is_artist', true)
          .order('last_active', { ascending: false, nullsFirst: false })
          .limit(6)
          .abortSignal(controller.signal);

        if (error) throw error;

        const artistsWithAvgRating = (data || []).map((artist: FeaturedArtist) => {
          const ratingInfo = calculateAverageRating(artist.reviews_data);
          return { ...artist, average_rating: ratingInfo.average, review_count: ratingInfo.count };
        });

        setFeaturedArtists(artistsWithAvgRating);
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          // Timed out — silently drop, empty state renders below
          console.warn('Featured artists fetch timed out after 15s');
        } else {
          const err = error as { message?: string };
          console.error('Error fetching featured artists:', error);
          toast({ title: "Error", description: err.message || "Could not load featured artists.", variant: "destructive" });
        }
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };

    fetchFeaturedArtists();
    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [toast]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigate(`/search?query=${encodeURIComponent(searchTerm)}&location=${encodeURIComponent(locationTerm)}`);
  };

  return (
    <div className="min-h-screen">
      {/* ── HERO ── */}
      <header className="relative py-24 md:py-36 text-center overflow-hidden">
        <div className="absolute inset-0 ink-gradient opacity-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background pointer-events-none z-0" />
        {/* Glow orbs */}
        <div className="absolute -top-10 left-1/3 w-80 h-80 bg-primary/12 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-primary/8 rounded-full blur-2xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="container mx-auto px-4 relative z-10"
        >
          {/* Logo mark */}
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="w-20 h-20 mx-auto mb-8 ink-gradient rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40"
          >
            <InkSnapLogo className="w-14 h-14" />
          </motion.div>

          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold tracking-widest uppercase mb-8"
          >
            <Zap className="w-3 h-3" /> Book your next session
          </motion.div>

          {/* Main heading */}
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tight leading-none mb-6">
            Find the ink<br />
            <span className="ink-text-gradient">you want.</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-12">
            Browse portfolios from talented tattoo artists, find your style, and book your next session — all in one place.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-10">
            <div className="flex flex-col md:flex-row gap-0 md:gap-0 p-1.5 glass-effect rounded-2xl border border-primary/15 shadow-2xl shadow-black/40">
              <div className="flex items-center flex-1 gap-2 px-4 py-1">
                <Search className="w-4 h-4 text-primary/60 shrink-0" />
                <Input
                  type="text"
                  placeholder="Style, artist, or keyword..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-10 px-0 text-sm placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="hidden md:block w-px bg-primary/10 my-2" />
              <div className="flex items-center flex-1 gap-2 px-4 py-1">
                <MapPin className="w-4 h-4 text-primary/60 shrink-0" />
                <Input
                  type="text"
                  placeholder="City, State..."
                  value={locationTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocationTerm(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-10 px-0 text-sm placeholder:text-muted-foreground/50"
                />
              </div>
              <Button type="submit" className="ink-gradient h-11 px-7 rounded-xl m-0.5 shrink-0 font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                Search
              </Button>
            </div>
          </form>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-6 md:gap-10 text-xs text-muted-foreground/60"
          >
            <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-400 fill-current" /> Top-rated artists</span>
            <span className="w-px h-4 bg-border/50" />
            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary/70" /> Growing community</span>
          </motion.div>
        </motion.div>
      </header>

      {/* ── FEATURED ARTISTS ── */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-end justify-between mb-10"
          >
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-1">Discover</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Featured Artists</h2>
            </div>
            <Link to="/search" className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              Browse all <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="glass-effect rounded-2xl p-6 animate-pulse">
                  <div className="flex items-center mb-4 gap-4">
                    <div className="w-14 h-14 bg-muted rounded-full shrink-0" />
                    <div className="flex-1"><div className="h-5 w-32 bg-muted rounded mb-2" /><div className="h-3.5 w-20 bg-muted rounded" /></div>
                  </div>
                  <div className="h-3.5 w-full bg-muted rounded mb-2" />
                  <div className="h-3.5 w-3/4 bg-muted rounded mb-4" />
                  <div className="flex gap-1 mb-4"><div className="h-5 w-14 bg-muted rounded-full" /><div className="h-5 w-16 bg-muted rounded-full" /></div>
                  <div className="flex justify-between"><div className="h-4 w-20 bg-muted rounded" /><div className="h-5 w-16 bg-muted rounded-full" /></div>
                </div>
              ))}
            </div>
          ) : featuredArtists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredArtists.map((artist, index) => (
                <motion.div
                  key={artist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 + 0.25 }}
                  className="h-full"
                >
                  <Link to={`/artist/${artist.username}`} className="block group h-full">
                    <div className="relative glass-effect rounded-2xl overflow-hidden h-full flex flex-col border border-border/40 group-hover:border-primary/30 transition-all duration-300 group-hover:shadow-[0_0_24px_rgba(229,62,62,0.15)]">
                      {artist.location_thumbnail_url && (
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-10 group-hover:opacity-20 transition-opacity duration-500"
                          style={{ backgroundImage: `url(${artist.location_thumbnail_url})` }}
                        />
                      )}
                      <div className="relative p-5 flex-grow flex flex-col z-10">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="w-14 h-14 border-2 border-primary/40 group-hover:border-primary/70 transition-colors shrink-0">
                            <AvatarImage src={artist.profile_photo_url ?? undefined} alt={artist.name ?? undefined} />
                            <AvatarFallback className="ink-gradient text-primary-foreground font-bold">{artist.name?.charAt(0)?.toUpperCase() || 'A'}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors truncate">{artist.name}</h3>
                            <p className="text-xs text-muted-foreground">@{artist.username}</p>
                            {artist.location && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{artist.location}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-foreground/75 line-clamp-2 mb-3 flex-grow leading-relaxed">{artist.bio || 'No bio available.'}</p>

                        {artist.styles && artist.styles.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {artist.styles.slice(0, 3).map((style: string) => (
                              <span key={style} className="px-2 py-0.5 bg-primary/15 text-primary text-xs rounded-full border border-primary/20 font-medium">{style}</span>
                            ))}
                          </div>
                        )}

                        <div className="mt-auto border-t border-border/20 pt-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                            <span className="font-medium text-foreground">{artist.average_rating > 0 ? artist.average_rating : 'N/A'}</span>
                            <span>({artist.review_count})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {timeSince(artist.last_active) && (
                              <span className="text-muted-foreground/60 hidden sm:block"><Clock className="w-3 h-3 inline mr-0.5" />{timeSince(artist.last_active)}</span>
                            )}
                            {artist.booking_status
                              ? <span className="px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full border border-green-500/20">Available</span>
                              : <span className="px-2 py-0.5 bg-red-500/15 text-red-400 rounded-full border border-red-500/20">Booked</span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">No featured artists available yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── DEVELOPER ZONE ── */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl overflow-hidden border border-primary/10"
            style={{ background: 'rgba(20,20,20,0.7)', backdropFilter: 'blur(12px)' }}
          >
            {/* Top accent bar */}
            <div className="h-0.5 w-full ink-gradient" />
            <div className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 ink-gradient rounded-lg flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Developer Zone</h2>
                  <p className="text-xs text-muted-foreground">What's been shipped & what's next</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <h3 className="text-sm font-semibold tracking-widest uppercase text-primary mb-4 flex items-center gap-2">
                    <Newspaper className="w-4 h-4" /> Dev News
                  </h3>
                  <div className="space-y-5">
                    {devNews.map((item, index) => (
                      <div key={index} className="relative pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:ink-gradient">
                        <p className="text-xs text-muted-foreground/60 mb-0.5">{item.date}</p>
                        <p className="font-semibold text-sm mb-1">{item.title}</p>
                        <p className="text-xs text-foreground/60 leading-relaxed">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold tracking-widest uppercase text-primary mb-4">Why InkSnap?</h3>
                  <ul className="space-y-4">
                    {whyChooseReasons.map((reason, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm text-foreground/75 leading-relaxed">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

export const meta: PageMeta = {
  title: 'InkSnap - Tattoo Artist Discovery',
  description: 'Find and connect with tattoo artists near you.',
};
