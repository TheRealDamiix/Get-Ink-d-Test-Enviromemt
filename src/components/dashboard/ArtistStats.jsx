import React from 'react';
import { Users, Star, Upload } from 'lucide-react';

const ArtistStats = ({ user }) => {
  
  const avgRating = user.reviews_count > 0 ? (user.total_rating_sum / user.reviews_count).toFixed(1) : 'N/A';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="glass-effect rounded-xl p-6">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">{user.followers_count || 0}</p>
            <p className="text-sm text-muted-foreground">Followers</p>
          </div>
        </div>
      </div>
      <div className="glass-effect rounded-xl p-6">
        <div className="flex items-center gap-3">
          <Star className="w-8 h-8 text-yellow-400" />
          <div>
            <p className="text-2xl font-bold">{avgRating}</p>
            <p className="text-sm text-muted-foreground">Average Rating ({user.reviews_count || 0} reviews)</p>
          </div>
        </div>
      </div>
      <div className="glass-effect rounded-xl p-6">
        <div className="flex items-center gap-3">
          <Upload className="w-8 h-8 text-green-400" />
          <div>
            <p className="text-2xl font-bold">{user.portfolio_count || 0}</p>
            <p className="text-sm text-muted-foreground">Portfolio Images</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistStats;