import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Eye, RefreshCw } from 'lucide-react';
import ArtistStats from '@/components/dashboard/ArtistStats';
import ProfileSettings from '@/components/dashboard/ProfileSettings';
import PortfolioManager from '@/components/dashboard/PortfolioManager';

const ArtistDashboard = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!user || !user.isArtist) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleVisibilityRefresh = () => {
    const updatedUser = { ...user, lastActive: new Date().toISOString() };
    updateUser(updatedUser);
    toast({ title: "Visibility refreshed!", description: "Your profile has been moved to the top of search results." });
  };

  if (!user || !user.isArtist) {
    return null;
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-6 gap-4">
            <h1 className="text-3xl font-bold ink-text-gradient">Artist Dashboard</h1>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <a href={`/artist/${user.username}`} target="_blank" rel="noopener noreferrer">
                  <Eye className="w-4 h-4 mr-2" /> View Profile
                </a>
              </Button>
              <Button onClick={handleVisibilityRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </div>
          </div>
          <ArtistStats user={user} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <ProfileSettings user={user} updateUser={updateUser} toast={toast} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <PortfolioManager user={user} updateUser={updateUser} toast={toast} />
        </motion.div>
      </div>
    </div>
  );
};

export default ArtistDashboard;