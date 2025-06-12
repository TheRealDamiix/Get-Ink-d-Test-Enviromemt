import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const HomePage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

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

  return (
    <div className="min-h-screen flex items-center">
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
            className="max-w-xl mx-auto mb-12 p-4 glass-effect rounded-xl"
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
    </div>
  );
};

export default HomePage;