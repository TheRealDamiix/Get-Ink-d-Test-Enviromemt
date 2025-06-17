import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

export const timeSince = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000; // years
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000; // months
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400; // days
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600; // hours
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60; // minutes
  if (interval > 1) return Math.floor(interval) + "m ago";
  if (seconds < 10) return "just now";
  return Math.floor(seconds) + "s ago";
};

export const calculateAverageRating = (reviewsData) => {
  if (!reviewsData || reviewsData.length === 0) return { average: 0, count: 0 };
  const totalStars = reviewsData.reduce((acc, review) => acc + (review.stars || 0), 0); // Ensure review.stars exists
  const average = totalStars / reviewsData.length;
  return { average: parseFloat(average.toFixed(1)), count: reviewsData.length };
};

export const formatPrice = (price) => {
  if (price === null || price === undefined) return '';
  return `$${Number(price).toFixed(2)}`;
};

export const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.split(' ');
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};