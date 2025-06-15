
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Star, Clock, TrendingUp, Loader2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';

const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [internalSearchTerm, setInternalSearchTerm] = useState(searchParams.get('q') || '');
  const [filteredArtists, setFilteredArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState(null);
  const { toast } = useToast();

  const fetchArtists = useCallback(async (currentSearchTerm) => {
    if (!currentSearchTerm || currentSearchTerm.trim() === '') {
      setFilteredArtists([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setSearchLocation(null);

    let geocodedCoords = null;
    let isLocationSearch = false;

    try {
      const { data: geoData, error: geoError } = await supabase.functions.invoke('geocode-address', {
        body: { address: currentSearchTerm.trim() },
      });

      if (geoData && !geoError && geoData.latitude && geoData.longitude) {
        geocodedCoords = { lat: geoData.latitude, lon: geoData.longitude };
        setSearchLocation({ name: geoData.displayName, ...geocodedCoords });
        isLocationSearch = true;
        toast({
          title: "Location Detected",
          description: `Searching near ${geoData.displayName.substring(0,50)}...`,
        });
      } else {
         if (geoError && geoError.message && !geoError.message.includes("No results found")) {
            console.warn('Geocoding error, proceeding with keyword search:', geoError.message);
         }
      }
    } catch (e) {
      console.warn('Error calling geocode-address function, proceeding with keyword search:', e);
    }
    
    try {
      const rpcParams = { 
        keyword: currentSearchTerm.trim(),
        search_lat: geocodedCoords ? geocodedCoords.lat : null,
        search_lon: geocodedCoords ? geocodedCoords.lon : null,
      };

      const { data, error } = await supabase.rpc('search_artists', rpcParams);

      if (error) {
        console.error('Error searching artists:', error);
        toast({
          title: 'Search Error',
          description: error.message || 'Could not perform search. Please try again.',
          variant: 'destructive',
        });
        setFilteredArtists([]);
      } else {
        const artistsWithDetails = data.map(artist => {
          const totalRating = artist.reviews_data?.reduce((acc, review) => acc + review.stars, 0) || 0;
          const reviewCount = artist.reviews_data?.length || 0;
          const avgRating = reviewCount > 0 ? (totalRating / reviewCount).toFixed(1) : 'N/A';
          
          let distanceDisplay = null;
          if (artist.distance_km != null) {
            distanceDisplay = artist.distance_km < 1 ? `${(artist.distance_km * 1000).toFixed(0)} m away` : `${artist.distance_km.toFixed(1)} km away`;
          }

          return { ...artist, avg_rating: avgRating, review_count: reviewCount, distance_display: distanceDisplay };
        });
        setFilteredArtists(artistsWithDetails || []);
      }
    } catch (e) {
      console.error('Unexpected error searching artists:', e);
      toast({
        title: 'Search Error',
        description: 'An unexpected error occurred during search.',
        variant: 'destructive',
      });
      setFilteredArtists([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, supabase]);

  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearchTerm(query);
    setInternalSearchTerm(query); 
    fetchArtists(query);
  }, [searchParams, fetchArtists]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (internalSearchTerm.trim() === '') {
      toast({
        title: "Search field is empty",
        description: "Please enter a search term.",
        variant: "destructive"
      });
      return;
    }
    setSearchParams({ q: internalSearchTerm });
  };
  
  const getActivityStatus = (lastActive) => {
    if (!lastActive) return null;
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffHours = (now - lastActiveDate) / (1000 * 60 * 60);
    
    if (diffHours < 48) return { text: 'Just Updated', color: 'text-green-400' };
    if (diffHours < 168) return { text: 'Recently Active', color: 'text-yellow-400' };
    return null;
  };
  
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 glass-effect rounded-xl"
        >
          <form onSubmit={handleSearchSubmit} className="flex gap-2 items-center">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Search by artist, style, city, or address..."
                value={internalSearchTerm}
                onChange={(e) => setInternalSearchTerm(e.target.value)}
                className="pl-12 h-12 text-md bg-background/70 border-border/50"
              />
            </div>
            <Button type="submit" className="ink-gradient h-12 text-base px-6" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
            </Button>
          </form>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-6 gap-2">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">Search Results</h1>
          </div>
          {searchTerm && (
            <p className="text-muted-foreground text-sm sm:text-base">
              Showing results for: <span className="text-foreground font-semibold">"{searchTerm}"</span>
              {searchLocation && <span className="text-primary ml-1">(near {searchLocation.name.substring(0,30)}...)</span>}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Searching for artists...</p>
          </div>
        ) : filteredArtists.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full glass-effect flex items-center justify-center">
              <Search className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">No artists found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm ? "Try adjusting your search terms or check back later." : "Enter a search term above to find artists."}
            </p>
            <Button asChild className="ink-gradient">
              <Link to="/">Back to Home</Link>
            </Button>
          </motion.div>
        ) : (
          <>
            <p className="text-muted-foreground mb-6">
              {filteredArtists.length} artist{filteredArtists.length !== 1 ? 's' : ''} found.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArtists.map((artist, index) => {
                const activityStatus = getActivityStatus(artist.last_active);
                return (
                  <motion.div
                    key={artist.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
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

                        <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-1">
                          <MapPin className="w-4 h-4" />
                          <span>{artist.location || 'Location not set'}</span>
                        </div>
                        
                        {artist.distance_display && (
                          <div className="flex items-center space-x-1 text-sm text-primary mb-3">
                            <Navigation className="w-4 h-4" />
                            <span>{artist.distance_display}</span>
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
                          <div className="flex items-center justify-between">
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
          </>
        )}
      </div>
    </div>
  );
};

export default SearchResultsPage;
