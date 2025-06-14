
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Star, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [artists, setArtists] = useState([]);
  const [filteredArtists, setFilteredArtists] = useState([]);

  useEffect(() => {
    const users = JSON.parse(localStorage.getItem('inksnap_users') || '[]');
    const artistUsers = users.filter(user => user.isArtist);
    setArtists(artistUsers);
  }, []);

  const parseSearchTerm = (term) => {
    const lowerTerm = term.toLowerCase().trim();
    if (!lowerTerm) return { name: '', style: '', location: '', zip: '' };

    const terms = lowerTerm.split(/\s+/);
    let nameKeywords = [];
    let styleKeywords = [];
    let locationKeywords = [];
    let zipCode = '';

    const knownStyles = ["traditional", "realism", "japanese", "watercolor", "neo-traditional", "tribal", "blackwork", "dotwork", "geometric", "script"];
    const knownLocationHints = ["nc", "ca", "ny", "fl", "tx", "il", "pa", "oh", "ga", "mi", "wa", "ma", "va", "nj", "co", "az", "or", "tn", "mo", "md", "wi", "mn", "sc", "al", "la", "ky", "ok", "ct", "ut", "ia", "nv", "ar", "ms", "ks", "nm", "ne", "id", "hi", "wv", "me", "nh", "ri", "mt", "de", "sd", "nd", "ak", "dc", "vt", "wy", "city", "town", "ville", "beach", "springs", "creek", "valley", "heights", "park", "bay", "harbor"];

    terms.forEach(t => {
      if (/^\d{5}(-\d{4})?$/.test(t)) {
        zipCode = t.split('-')[0];
      } else if (knownStyles.includes(t)) {
        styleKeywords.push(t);
      } else {
        nameKeywords.push(t);
      }
    });
    
    let possibleCityParts = [];
    let finalNameKeywords = [];
    for (let i = nameKeywords.length - 1; i >= 0; i--) {
        const word = nameKeywords[i];
        if (knownLocationHints.includes(word) || (word.length === 2 && /[a-z]{2}/.test(word)) || possibleCityParts.length > 0 ) {
             possibleCityParts.unshift(word);
        } else {
            finalNameKeywords.unshift(word);
        }
    }
    if(possibleCityParts.length > 0){
        locationKeywords = possibleCityParts;
    } else {
        finalNameKeywords = nameKeywords;
    }

    return {
      name: finalNameKeywords.join(' '),
      style: styleKeywords.join(' '),
      location: locationKeywords.join(' '),
      zip: zipCode,
    };
  };

  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearchTerm(query);
    const parsed = parseSearchTerm(query);
    
    if (query.trim()) {
      const filtered = artists.filter(artist => {
        let matchesName = true;
        let matchesStyle = true;
        let matchesLocation = true;
        let matchesZip = true;

        if (parsed.name) {
          matchesName = artist.name?.toLowerCase().includes(parsed.name) ||
                        artist.username?.toLowerCase().includes(parsed.name);
        }
        if (parsed.style) {
          matchesStyle = artist.styles?.some(s => s.toLowerCase().includes(parsed.style));
        }
        
        const artistLocationLower = artist.location?.toLowerCase() || '';

        if (parsed.location) {
          matchesLocation = artistLocationLower.includes(parsed.location);
        }
        if (parsed.zip) {
          matchesZip = artistLocationLower.includes(parsed.zip);
        }
        
        let locationMatch = true;
        if(parsed.location || parsed.zip) {
            locationMatch = matchesLocation || matchesZip;
        }

        return matchesName && matchesStyle && locationMatch;
      });
      setFilteredArtists(filtered);
    } else {
      setFilteredArtists(artists);
    }
  }, [searchParams, artists]);

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-8 gap-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">Search Results</h1>
          </div>
          <p className="text-muted-foreground">Showing results for: <span className="text-foreground font-semibold">"{searchTerm}"</span></p>
          <span className="text-muted-foreground">
            {filteredArtists.length} artist{filteredArtists.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {filteredArtists.length === 0 ? (
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
              Try adjusting your search terms or check back later.
            </p>
            <Button asChild className="ink-gradient">
              <Link to="/">Back to Home</Link>
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArtists.map((artist, index) => {
              const activityStatus = getActivityStatus(artist.lastActive);
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
                            <AvatarImage src={artist.profilePhoto} alt={artist.name} />
                            <AvatarFallback className="ink-gradient text-white">
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
                            <span className="text-sm font-medium">4.8</span>
                            <span className="text-sm text-muted-foreground">(24 reviews)</span>
                          </div>
                          {artist.bookingStatus && (
                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">Available</span>
                          )}
                        </div>
                        {artist.portfolio && artist.portfolio.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {artist.portfolio.slice(0, 3).map((image, idx) => (
                              <div key={idx} className="aspect-square rounded-lg overflow-hidden">
                                <img src={image.image} alt={image.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              </div>
                            ))}
                          </div>
                        )}
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
