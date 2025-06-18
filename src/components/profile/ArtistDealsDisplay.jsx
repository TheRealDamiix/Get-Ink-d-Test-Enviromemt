import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Tag, DollarSign, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ArtistDealsDisplay = ({ artistId }) => {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const { toast } = useToast();

  const fetchDeals = useCallback(async () => {
    if (!artistId) {
      setDeals([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('artist_deals')
      .select('*')
      .eq('artist_id', artistId)
      .or(`valid_until.gte.${today},valid_until.is.null`)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error fetching artist deals", description: error.message, variant: "destructive" });
    } else {
      setDeals(data || []);
    }
    setIsLoading(false);
  }, [artistId, toast]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Ongoing';
    const date = new Date(dateString);
    return `Valid until: ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  };

  if (isLoading) {
    return (
      <div className="my-8 p-6 glass-effect rounded-xl text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
      </div>
    );
  }

  if (deals.length === 0) {
    return null; // Don't render the section if there are no deals
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-8"
      >
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Tag className="w-6 h-6 mr-3 text-primary" />
          Current Deals & Offers
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {deals.map((deal, index) => (
            <motion.button
              key={deal.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedDeal(deal)}
              // Apply background image and styles
              style={deal.image_url ? { backgroundImage: `url(${deal.image_url})` } : {}}
              className="relative text-left p-3 glass-effect rounded-xl hover:border-primary/70 transition-all border border-transparent flex flex-col items-center justify-center aspect-square overflow-hidden bg-cover bg-center group"
            >
              {/* Overlay to ensure text readability */}
              <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors"></div>

              {/* Foreground content */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center h-full text-white">
                 <div className="flex-grow flex items-center justify-center">
                    {deal.price !== null ? (
                        <div>
                            <DollarSign className="w-8 h-8 mx-auto text-green-400 mb-1" />
                            <p className="text-2xl font-bold text-green-400">${Number(deal.price).toFixed(0)}</p>
                        </div>
                    ) : (
                        <Tag className="w-10 h-10 text-primary" />
                    )}
                </div>
                <p className="text-xs font-semibold mt-2 line-clamp-2">{deal.title}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {selectedDeal && (
        <Dialog open={!!selectedDeal} onOpenChange={(isOpen) => !isOpen && setSelectedDeal(null)}>
          <DialogContent className="glass-effect">
            <DialogHeader>
              <DialogTitle className="text-2xl text-primary">{selectedDeal.title}</DialogTitle>
              <DialogDescription>
                {formatDate(selectedDeal.valid_until)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedDeal.image_url && (
                <img src={selectedDeal.image_url} alt={selectedDeal.title} className="rounded-lg max-h-60 w-full object-cover" />
              )}
              {selectedDeal.price !== null && (
                <p className="text-3xl font-bold text-green-400 flex items-center">
                  <DollarSign className="w-6 h-6 mr-1" />{Number(selectedDeal.price).toFixed(2)}
                </p>
              )}
              {selectedDeal.deal_description && (
                <p className="text-foreground/90 whitespace-pre-wrap">{selectedDeal.deal_description}</p>
              )}
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="absolute top-3 right-3">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ArtistDealsDisplay;
