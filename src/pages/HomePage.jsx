
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MapPin, Star, TrendingUp, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { timeSince, calculateAverageRating } from '@/lib/utils';

const HomePage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationTerm, setLocationTerm] = useState('');
  const [featuredArtists, setFeaturedArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const newLogoUrl = "https://storage.googleapis.com/hostinger-horizons-assets-prod/dc3f6a73-e4ae-4a98-96ee-f971fdcf05b8/adae335f6caa43250fd8bd69651ee119.png";


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
        <div className="absolute inset-0 ink-gradient opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background z-0"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="container mx-auto px-4 relative z-10"
        >
          <div className="w-24 h-24 mx-auto mb-6 ink-gradient rounded-3xl flex items-center justify-center shadow-2xl">
            <img src={newLogoUrl} alt="InkSnap Logo" className="w-20 h-20 rounded-2xl object-contain" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Discover Your Next <span className="ink-text-gradient">Masterpiece</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Connect with talented tattoo artists, explore stunning portfolios, and book your next ink session with InkSnap.
          </p>
          <form onSubmit={handleSearch} className="max-w-xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 items-center mb-12">
            <Input
              type="text"
              placeholder="Search by style, artist, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 text-base"
            />
            <Input
              type="text"
              placeholder="Enter location (e.g., City, State)"
              value={locationTerm}
              onChange={(e) => setLocationTerm(e.target.value)}
              className="h-12 text-base"
            />
            <Button type="submit" className="md:col-span-2 ink-gradient h-12 text-lg">
              <Search className="mr-2 h-5 w-5 text-white" /> Find Artists
            </Button>
          </form>
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
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 bg-muted rounded-full mr-4"></div>
                    <div>
                      <div className="h-6 w-32 bg-muted rounded mb-1"></div>
                      <div className="h-4 w-24 bg-muted rounded"></div>
                    </div>
                  </div>
                  <div className="h-4 w-full bg-muted rounded mb-2"></div>
                  <div className="h-4 w-3/4 bg-muted rounded mb-4"></div>
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-20 bg-muted rounded"></div>
                    <div className="h-8 w-24 bg-muted rounded-full"></div>
                  </div>
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
                  transition={{ delay: index * 0.1 + 0.3 }}
                  className="h-full"
                >
                  <Link to={`/artist/${artist.username}`} className="block group h-full">
                    <div className="glass-effect rounded-xl overflow-hidden h-full flex flex-col relative">
                       {artist.location_thumbnail_url && (
                        <div 
                          className="absolute inset-0 bg-cover bg-center opacity-15 group-hover:opacity-25 transition-opacity duration-300"
                          style={{ backgroundImage: `url(${artist.location_thumbnail_url})` }}
                        ></div>
                      )}
                      <div className="p-5 flex-grow flex flex-col z-10 bg-card/50 group-hover:bg-card/30 transition-colors duration-300">
                        <div className="flex items-center mb-3">
                          <Avatar className="w-16 h-16 mr-4 border-2 border-primary/50">
                            <AvatarImage src={artist.profile_photo_url} alt={artist.name} />
                            <AvatarFallback className="ink-gradient text-primary-foreground">
                              {artist.name?.charAt(0)?.toUpperCase() || 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">{artist.name}</h3>
                            <p className="text-sm text-muted-foreground">@{artist.username}</p>
                          </div>
                        </div>
                        {artist.location && (
                          <div className="flex items-center text-sm text-muted-foreground mb-1">
                            <MapPin className="w-4 h-4 mr-2 text-foreground" />
                            <span>{artist.location}</span>
                          </div>
                        )}
                        <p className="text-sm text-foreground/90 line-clamp-2 mb-3 flex-grow">{artist.bio || "No bio available."}</p>
                        
                        {artist.styles && artist.styles.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {artist.styles.slice(0, 3).map(style => (
                              <span key={style} className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                                {style}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="mt-auto border-t border-border/30 pt-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                              <span>{artist.average_rating > 0 ? artist.average_rating : 'N/A'} ({artist.review_count} reviews)</span>
                            </div>
                            {artist.booking_status ? (
                              <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">Available</span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full">Booked</span>
                            )}
                          </div>
                           {timeSince(artist.last_active) && (
                            <div className="flex items-center text-xs text-muted-foreground mt-2">
                              <Clock className="w-3 h-3 mr-1.5 text-foreground" />
                              Active: {timeSince(artist.last_active)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No featured artists available at the moment.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;