import React from 'react';
import { motion } from 'framer-motion';
import { Maximize } from 'lucide-react';

const PortfolioGrid = ({ portfolio, onImageSelect }) => {
  if (!portfolio || portfolio.length === 0) {
    return null; 
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-8"
    >
      <h2 className="text-2xl font-bold mb-6 text-center">Portfolio</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 md:gap-2">
        {portfolio.map((item, idx) => (
          <motion.div
            key={item.id || idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="group cursor-pointer relative"
            onClick={() => onImageSelect(item)}
          >
            <div className="aspect-square rounded-md overflow-hidden">
              <img
                src={item.cloudinary_url}
                alt={item.caption || 'Portfolio image'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize className="w-8 h-8 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default PortfolioGrid;