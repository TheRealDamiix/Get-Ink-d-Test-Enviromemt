import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Star, Clock, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';

const HomePage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [artists, setArtists] = useState([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const users = JSON.parse(localStorage.getItem('inklink_users') || '[]');
    const artistUsers = users.filter(user => user.isArtist);
    setArtists(artistUsers);
  }, []);

  const getActivityStatus = (lastActive) => {
    if (!lastActive) return null;
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffHours = (now - lastActiveDate) / (1000 * 60 * 60);
    
    if (diffHours < 48) return { text: 'Just Updated', color: 'text-green-400' };
    if (diffHours < 168) return { text: 'Recently Active', color: 'text-yellow-400' };
    return null;
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      toast({
        title: "Searching...",
        description: `Redirecting to search results for: ${searchTerm}`,
      });
      navigate('/search-results', { state: { searchTerm: searchTerm } });
    } else {
      toast({
        title: "Empty Search",
        description: "Please enter a search term.",
        variant: "destructive"
      });
    }
  };

  // Select the first 3 artists for the featured section
  const featuredArtists = artists.slice(0, 3);

  return (
    <div className="min-h-screen">
      <section className="relative py-20 px-4 overflow-hidden">
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
            className="max-w-xl mx-auto mb-12 p-4 glass-effect rounded-xl"
          >
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Search artist, style, city, or zip..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
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
      
      {/* Featured Artists Section */}
      {featuredArtists.length > 0 && (
        <section className="py-16 px-4 bg-background">
          <div className="container mx-auto">
            <div className="flex items-center space-x-2 mb-8">
              <Sparkles className="w-6 h-6 text-yellow-400" />
              <h2 className="text-3xl font-bold">Featured Artists</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredArtists.map((artist, index) => {
                const activityStatus = getActivityStatus(artist.lastActive);
                return (
                  <motion.div
                    key={artist.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Link to={`/artist/${artist.username}`}>
                      <div className="glass-effect rounded-xl p-6 hover:border-primary/50 transition-all duration-300 group">
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
                              <span
                                key={idx}
                                className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full"
                              >
                                {style}
                              </span>
                            ))}
                            {artist.styles.length > 3 && (
                              <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                                +{artist.styles.length - 3} more
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-medium">4.8</span>
                            <span className="text-sm text-muted-foreground">(24 reviews)</span>
                          </div>
                          {artist.bookingStatus && (
                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                              Available
                            </span>
                          )}
                        </div>

                        {artist.portfolio && artist.portfolio.length > 0 && (
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            {artist.portfolio.slice(0, 3).map((image, idx) => (
                              <div key={idx} className="aspect-square rounded-lg overflow-hidden">
                                <img
                                  src={image.image}
                                  alt={image.caption}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
