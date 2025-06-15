
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CalendarDays, MapPin, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ConventionDatesSection = ({ artistId }) => {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConventionDates = async () => {
      if (!artistId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('convention_dates')
        .select('*')
        .eq('artist_id', artistId)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching convention dates:', error);
      } else {
        setDates(data || []);
      }
      setLoading(false);
    };

    fetchConventionDates();
  }, [artistId]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="my-8 p-6 glass-effect rounded-xl text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground mt-2">Loading Convention Dates...</p>
      </div>
    );
  }

  if (dates.length === 0) {
    return (
      <div className="my-8 p-6 glass-effect rounded-xl text-center">
        <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-xl font-semibold">No Upcoming Conventions</h3>
        <p className="text-muted-foreground">This artist hasn't listed any convention dates yet.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-8 p-6 glass-effect rounded-xl"
    >
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <CalendarDays className="w-6 h-6 mr-3 text-primary" />
        Convention & Guest Spot Dates
      </h2>
      <div className="space-y-6">
        {dates.map((event, index) => (
          <motion.div 
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 border border-border/50 rounded-lg hover:border-primary/70 transition-colors"
          >
            <h3 className="text-lg font-semibold text-primary">{event.event_name}</h3>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{event.location}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(event.start_date)}
              {event.end_date && ` - ${formatDate(event.end_date)}`}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ConventionDatesSection;
