
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, Search, Frown, Loader2, Clock, SlidersHorizontal } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { timeSince, calculateAverageRating } from '@/lib/utils';
import LocationAutocomplete from '@/components/ui/LocationAutocomplete';

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
          body: JSON.stringify({ address: currentSearchLocation }),
        });
        if (geoError) {
          console.warn("Geocoding error for search:", geoError.message || geoData?.error);
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
        location_text: currentSearchLocation.trim() 
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
    if (query.trim() !== '' || location.trim() !== '' || (searchParams.has('query') || searchParams.has('location'))) {
      performSearch(query, location);
    }
  }, [searchParams, performSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ query: searchTerm, location: locationTerm });
  };

  const hasSearched = !!(searchParams.get('query') || searchParams.get('location'));

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-5xl">

        {/* Search bar */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-1">Search</p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Find Your Artist</h1>
          </div>
          <form onSubmit={handleSearchSubmit}>
            <div className="flex flex-col md:flex-row gap-0 p-1.5 rounded-2xl border border-primary/15 shadow-xl shadow-black/30"
                 style={{ background: 'rgba(22,22,22,0.7)', backdropFilter: 'blur(14px)' }}>
              <div className="flex items-center flex-1 gap-2 px-4 py-1">
                <Search className="w-4 h-4 text-primary/50 shrink-0" />
                <Input id="search-term" type="text" value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Style, artist name, or keyword..."
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-10 px-0 text-sm placeholder:text-muted-foreground/40" />
              </div>
              <div className="hidden md:block w-px bg-primary/10 my-2" />
              <div className="flex items-center flex-1 px-2 py-1">
                <LocationAutocomplete
                  id="search-location"
                  value={locationTerm}
                  onChange={setLocationTerm}
                  onSelect={(suggestion) => {
                    setLocationTerm(suggestion.display);
                    setSearchParams({ query: searchTerm, location: suggestion.display });
                  }}
                  placeholder="City, State, or Zip..."
                  className="flex-1"
                  inputClassName="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-10 text-sm placeholder:text-muted-foreground/40"
                />
              </div>
              <Button type="submit" className="ink-gradient h-11 px-7 rounded-xl m-0.5 font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow shrink-0" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" />Search</>}
              </Button>
            </div>
          </form>
        </motion.div>

        {/* Results count */}
        {!isLoading && !error && results.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{results.length}</span> artist{results.length !== 1 ? 's' : ''} found
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Sorted by relevance
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-4 ink-gradient rounded-2xl flex items-center justify-center animate-pulse">
              <Search className="w-7 h-7 text-white" />
            </div>
            <p className="text-muted-foreground text-sm">Finding artists for you...</p>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="text-center py-12 rounded-2xl border border-destructive/20 p-8"
               style={{ background: 'rgba(22,22,22,0.6)', backdropFilter: 'blur(10px)' }}>
            <Frown className="w-12 h-12 text-destructive/70 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-destructive mb-1">Search Failed</h2>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        )}

        {/* No results */}
        {!isLoading && !error && results.length === 0 && hasSearched && (
          <div className="text-center py-16 rounded-2xl border border-border/30 p-8"
               style={{ background: 'rgba(22,22,22,0.6)', backdropFilter: 'blur(10px)' }}>
            <div className="w-14 h-14 mx-auto mb-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center">
              <Frown className="w-7 h-7 text-primary/60" />
            </div>
            <h2 className="text-xl font-bold mb-2">No Artists Found</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">Try different keywords, a broader location, or browse all artists from the home page.</p>
          </div>
        )}

        {/* Results grid */}
        {!isLoading && !error && results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((artist, index) => {
              const { average: avgRating, count: reviewCount } = calculateAverageRating(artist.reviews_data);
              const lastActiveTime = timeSince(artist.last_active);
              return (
                <motion.div key={artist.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
                  <Link to={`/artist/${artist.username}`} className="block group h-full">
                    <div className="relative glass-effect rounded-2xl overflow-hidden h-full flex flex-col border border-border/40 group-hover:border-primary/30 transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(229,62,62,0.12)]">
                      {artist.location_thumbnail_url && (
                        <div className="absolute inset-0 bg-cover bg-center opacity-10 group-hover:opacity-18 transition-opacity duration-500"
                          style={{ backgroundImage: `url(${artist.location_thumbnail_url})` }} />
                      )}
                      <div className="relative p-5 flex-grow flex flex-col z-10">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="w-13 h-13 border-2 border-primary/40 group-hover:border-primary/70 transition-colors shrink-0">
                            <AvatarImage src={artist.profile_photo_url} alt={artist.name} />
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

                        {artist.distance_km !== null && typeof artist.distance_km === 'number' && (
                          <span className="text-xs text-green-400 mb-2 font-medium">~{artist.distance_km.toFixed(1)} km away</span>
                        )}

                        <p className="text-sm text-foreground/70 line-clamp-2 mb-3 flex-grow leading-relaxed">{artist.bio || 'No bio available.'}</p>

                        {artist.styles?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {artist.styles.slice(0, 3).map(style => (
                              <span key={style} className="px-2 py-0.5 bg-primary/15 text-primary text-xs rounded-full border border-primary/20 font-medium">{style}</span>
                            ))}
                          </div>
                        )}

                        <div className="mt-auto border-t border-border/20 pt-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                            <span className="font-medium text-foreground">{avgRating > 0 ? avgRating : 'N/A'}</span>
                            <span>({reviewCount})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {lastActiveTime && <span className="text-muted-foreground/50 hidden sm:block"><Clock className="w-3 h-3 inline mr-0.5" />{lastActiveTime}</span>}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsPage;