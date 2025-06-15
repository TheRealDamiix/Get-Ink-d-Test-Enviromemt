
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Star, Clock, TrendingUp, KeyRound as UsersRound, GalleryVerticalEnd, Award, Palette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabaseClient';

const HomePage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [featuredArtists, setFeaturedArtists] = useState([]);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchFeaturedArtists = async () => {
      setLoadingArtists(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, name, profile_photo_url, bio, location, styles, booking_status, last_active, reviews!reviews_artist_id_fkey(stars)')
          .eq('is_artist', true)
          .order('last_active', { ascending: false, nullsFirst: false })
          .limit(3);

        if (error) {
          console.error("Error fetching featured artists:", error);
          toast({ title: "Error", description: "Could not load featured artists.", variant: "destructive"});
          setFeaturedArtists([]);
        } else {
          const artistsWithAvgRating = data.map(artist => {
            const totalRating = artist.reviews.reduce((acc, review) => acc + review.stars, 0);
            const avgRating = artist.reviews.length > 0 ? (totalRating / artist.reviews.length).toFixed(1) : 'N/A';
            const reviewCount = artist.reviews.length;
            return { ...artist, avg_rating: avgRating, review_count: reviewCount };
          });
          setFeaturedArtists(artistsWithAvgRating);
        }
      } catch (e) {
        console.error("Unexpected error fetching artists:", e);
        toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive"});
        setFeaturedArtists([]);
      } finally {
        setLoadingArtists(false);
      }
    };
    fetchFeaturedArtists();
  }, [toast]);

  const handleSearch = () => {
    if (searchTerm.trim() === '') {
      toast({
        title: "Search field is empty",
        description: "Please enter a search term to find artists.",
        variant: "destructive"
      });
      return;
    }
    navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getActivityStatus = (lastActive) => {
    if (!lastActive) return null;
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffHours = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 48) return { text: 'Just Updated', color: 'text-green-400' };
    if (diffHours < 168) return { text: 'Recently Active', color: 'text-yellow-400' };
    return null;
  };

  const whyInkSnapFeatures = [
    {
      icon: UsersRound,
      title: "Discover Top Talent",
      description: "Easily find and connect with a diverse range of skilled tattoo artists tailored to your style.",
    },
    {
      icon: GalleryVerticalEnd,
      title: "Explore Stunning Portfolios",
      description: "Browse thousands of high-quality tattoo designs and artist portfolios to find your inspiration.",
    },
    {
      icon: Award,
      title: "Verified Reviews & Ratings",
      description: "Make informed decisions with genuine client reviews and transparent artist ratings.",
    }
  ];


  return (
    <div className="min-h-screen">
      <section className="w-full relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 ink-gradient opacity-10"></div>
        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Find Your Perfect
              <span className="block ink-text-gradient">Tattoo Artist</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Discover talented artists by name, style, city, or zip code.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-xl mx-auto p-4 glass-effect rounded-xl"
          >
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Search artist, style, city, or zip..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-12 h-14 text-lg bg-background/70 border-border/50"
                />
              </div>
              <Button onClick={handleSearch} className="ink-gradient h-14 text-base px-8">
                Search
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-center space-x-2 mb-12">
            <TrendingUp className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold text-center">Featured Artists</h2>
          </div>
          
          {loadingArtists ? (
            <div className="text-center py-10 text-muted-foreground">Loading artists...</div>
          ) : featuredArtists.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No featured artists to show right now. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredArtists.map((artist, index) => {
                const activityStatus = getActivityStatus(artist.last_active);
                return (
                  <motion.div
                    key={artist.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Link to={`/artist/${artist.username}`}>
                      <div className="glass-effect rounded-xl p-6 hover:border-primary/50 transition-all duration-300 group h-full flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={artist.profile_photo_url} alt={artist.name} />
                              <AvatarFallback className="ink-gradient text-primary-foreground">
                                {artist.name?.charAt(0)?.toUpperCase() || 'A'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold group-hover:text-primary transition-colors">
                                {artist.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">@{artist.username}</p>
                            </div>
                          </div>
                          {activityStatus && (
                            <div className={`flex items-center space-x-1 ${activityStatus.color}`}>
                              <Clock className="w-3 h-3" />
                              <span className="text-xs font-medium">{activityStatus.text}</span>
                            </div>
                          )}
                        </div>

                        {artist.bio && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {artist.bio}
                          </p>
                        )}

                        {artist.location && (
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-3">
                            <MapPin className="w-4 h-4" />
                            <span>{artist.location}</span>
                          </div>
                        )}

                        {artist.styles && artist.styles.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {artist.styles.slice(0, 3).map((style, idx) => (
                              <span key={idx} className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">{style}</span>
                            ))}
                            {artist.styles.length > 3 && (
                              <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">+{artist.styles.length - 3} more</span>
                            )}
                          </div>
                        )}

                        <div className="mt-auto">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-sm font-medium">{artist.avg_rating !== 'N/A' ? artist.avg_rating : '-'}</span>
                              <span className="text-sm text-muted-foreground">({artist.review_count} reviews)</span>
                            </div>
                            {artist.booking_status && (
                              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">Available</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 px-4 bg-card/30">
        <div className="container mx-auto">
          <div className="flex items-center justify-center space-x-2 mb-12">
            <Palette className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold text-center">Why Choose InkSnap?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyInkSnapFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.15 }}
                className="glass-effect rounded-xl p-8 text-center h-full flex flex-col items-center"
              >
                <div className="p-4 ink-gradient rounded-full inline-block mb-6">
                  <feature.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
