
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Tag, CalendarOff, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const ArtistDealsDisplay = ({ artistId }) => {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDeals = useCallback(async () => {
    if (!artistId) {
      setDeals([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const today = new Date().toISOString().split('T')[0]; // For date comparison
    const { data, error } = await supabase
      .from('artist_deals')
      .select('*')
      .eq('artist_id', artistId)
      .or(`valid_until.gte.${today},valid_until.is.null`) // Active deals or ongoing deals
      .order('valid_until', { ascending: true, nullsFirst: false }) 
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error fetching artist deals", description: error.message, variant: "destructive" });
      setDeals([]);
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
    // Check if time part is midnight, if so, it's likely just a date
    if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0) {
      return `Valid until: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return `Valid until: ${date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
  };

  if (isLoading) {
    return (
      <div className="my-8 p-6 glass-effect rounded-xl text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground mt-2">Loading Artist Deals...</p>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="my-8 p-6 glass-effect rounded-xl text-center">
        <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-xl font-semibold">No Active Deals</h3>
        <p className="text-muted-foreground">This artist currently has no special offers.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-8 p-6 glass-effect rounded-xl"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center">
          <Tag className="w-6 h-6 mr-3 text-primary" />
          Current Deals & Offers
        </h2>
      </div>
      <div className="space-y-6">
        {deals.map((deal, index) => (
          <motion.div 
            key={deal.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 border border-border/50 rounded-lg hover:border-primary/50 transition-colors"
          >
            {deal.image_url && (
              <div className="mb-3 rounded-md overflow-hidden max-h-60">
                <img-replace src={deal.image_url} alt={deal.title} className="w-full h-full object-cover" />
              </div>
            )}
            <h3 className="text-lg font-semibold text-primary">{deal.title}</h3>
            {deal.deal_description && <p className="text-sm text-foreground/90 mt-1 mb-2 whitespace-pre-wrap">{deal.deal_description}</p>}
            {deal.price !== null && deal.price !== undefined && (
              <p className="text-md font-semibold text-green-400 flex items-center mt-1 mb-2">
                <DollarSign className="w-4 h-4 mr-1" /> {Number(deal.price).toFixed(2)}
              </p>
            )}
            <Badge variant={deal.valid_until ? "secondary" : "default"} className="text-xs">
              {deal.valid_until && new Date(deal.valid_until) < new Date() ? (
                <><CalendarOff className="w-3 h-3 mr-1.5" /> Expired</>
              ) : (
                formatDate(deal.valid_until)
              )}
            </Badge>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ArtistDealsDisplay;
