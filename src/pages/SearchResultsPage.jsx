import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, Search, Frown, Loader2, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('query') || '');
  const [locationTerm, setLocationTerm] = useState(searchParams.get('location') || '');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const performSearch = useCallback(async (currentSearchTerm, currentSearchLocation) => {
    setIsLoading(true);
    setError(null);
    setResults([]);

    let searchLat = null;
    let searchLon = null;
    let geocodingAttempted = false;
    let geocodingSuccess = false;

    if (currentSearchLocation && currentSearchLocation.trim() !== '') {
      geocodingAttempted = true;
      try {
        const { data: geoData, error: geoError } = await supabase.functions.invoke('geocode-address', {
          body: { address: currentSearchLocation },
        });
        if (geoError) {
          console.warn("Geocoding error for search:", geoError.message);
        } else if (geoData && geoData.latitude && geoData.longitude) {
          searchLat = geoData.latitude;
          searchLon = geoData.longitude;
          geocodingSuccess = true;
        }
      } catch (e) {
        console.error("Error calling geocode function:", e);
      }
    }
    
    if (geocodingAttempted && !geocodingSuccess) {
      toast({ 
        title: "Location Notice", 
        description: "Could not find precise coordinates for the location. Searching by keyword and general location text.", 
        variant: "default" 
      });
    }


    try {
      const { data, error: searchError } = await supabase.rpc('search_artists', {
        keyword: currentSearchTerm.trim(),
        search_lat: searchLat,
        search_lon: searchLon,
        location_text: currentSearchLocation.trim() // Pass location_text for broader matching if lat/lon fails or isn't precise
      });

      if (searchError) throw searchError;
      setResults(data || []);
    } catch (err) {
      console.error('Error performing search:', err);
      setError('Failed to fetch search results. Please try again.');
      toast({ title: "Search Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const query = searchParams.get('query') || '';
    const location = searchParams.get('location') || '';
    // Only perform search if there's a query or location, or if the page loads with params
    if (query.trim() !== '' || location.trim() !== '' || (searchParams.has('query') || searchParams.has('location'))) {
      performSearch(query, location);
    }
  }, [searchParams, performSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ query: searchTerm, location: locationTerm });
  };

  const calculateAverageRating = (reviewsData) => {
    if (!reviewsData || reviewsData.length === 0) return { average: 0, count: 0 };
    const totalStars = reviewsData.reduce((acc, review) => acc + review.stars, 0);
    const average = totalStars / reviewsData.length;
    return { average: parseFloat(average.toFixed(1)), count: reviewsData.length };
  };

  const timeSince = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    if (seconds < 10) return "just now";
    return Math.floor(seconds) + "s ago";
  };


  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={handleSearchSubmit} className="mb-10 p-6 glass-effect rounded-xl">
            <h1 className="text-3xl font-bold mb-6 text-center ink-text-gradient">Find Your Artist</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="search-term" className="block text-sm font-medium mb-1">Keyword (Name, Style, Bio)</Label>
                <Input
                  id="search-term"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="e.g., realism, John Doe, floral"
                />
              </div>
              <div>
                <Label htmlFor="search-location" className="block text-sm font-medium mb-1">Location (City, State, Zip)</Label>
                <Input
                  id="search-location"
                  type="text"
                  value={locationTerm}
                  onChange={(e) => setLocationTerm(e.target.value)}
                  placeholder="e.g., New York, NY"
                />
              </div>
            </div>
            <Button type="submit" className="w-full ink-gradient" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Search Artists
            </Button>
          </form>
        </motion.div>

        {isLoading && (
          <div className="text-center py-10">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <p className="mt-4 text-muted-foreground">Searching for artists...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="text-center py-10 glass-effect rounded-xl p-6">
            <Frown className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-destructive mb-2">Search Failed</h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
        )}

        {!isLoading && !error && results.length === 0 && (searchParams.get('query') || searchParams.get('location')) && (
          <div className="text-center py-10 glass-effect rounded-xl p-6">
            <Frown className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Artists Found</h2>
            <p className="text-muted-foreground">Try adjusting your search terms or location.</p>
          </div>
        )}
        
        {!isLoading && !error && results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((artist, index) => {
              const { average: avgRating, count: reviewCount } = calculateAverageRating(artist.reviews_data);
              const lastActiveTime = timeSince(artist.last_active);
              return (
                <motion.div
                  key={artist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link to={`/artist/${artist.username}`} className="block group">
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
                            <MapPin className="w-4 h-4 mr-2 text-primary/80" />
                            <span>{artist.location}</span>
                          </div>
                        )}
                        {artist.distance_km !== null && typeof artist.distance_km === 'number' && (
                            <p className="text-xs text-green-400 mb-2">~{artist.distance_km.toFixed(1)} km away</p>
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
                              <span>{avgRating > 0 ? avgRating : 'N/A'} ({reviewCount} reviews)</span>
                            </div>
                            {artist.booking_status ? (
                              <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">Available</span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full">Booked</span>
                            )}
                          </div>
                          {lastActiveTime && (
                            <div className="flex items-center text-xs text-muted-foreground mt-2">
                              <Clock className="w-3 h-3 mr-1.5" />
                              Active: {lastActiveTime}
                            </div>
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
    </div>
  );
};

export default SearchResultsPage;