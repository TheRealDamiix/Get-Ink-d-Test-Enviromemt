import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

export const timeSince = (dateString: string | Date | null | undefined): string | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000; // years
  if (interval > 1) return Math.floor(interval) + 'y ago';
  interval = seconds / 2592000; // months
  if (interval > 1) return Math.floor(interval) + 'mo ago';
  interval = seconds / 86400; // days
  if (interval > 1) return Math.floor(interval) + 'd ago';
  interval = seconds / 3600; // hours
  if (interval > 1) return Math.floor(interval) + 'h ago';
  interval = seconds / 60; // minutes
  if (interval > 1) return Math.floor(interval) + 'm ago';
  if (seconds < 10) return 'just now';
  return Math.floor(seconds) + 's ago';
};

export const calculateAverageRating = (
  reviewsData: Array<{ stars?: number; rating?: number }> | null | undefined
): { average: number; count: number } => {
  if (!reviewsData || reviewsData.length === 0) return { average: 0, count: 0 };
  const totalStars = reviewsData.reduce(
    (acc, review) => acc + (review.stars ?? review.rating ?? 0),
    0
  );
  const average = totalStars / reviewsData.length;
  return { average: parseFloat(average.toFixed(1)), count: reviewsData.length };
};

export const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return '';
  return `$${Number(price).toFixed(2)}`;
};

export const getInitials = (name: string | null | undefined): string => {
  if (!name) return 'U';
  const parts = name.split(' ');
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string => {
  if (lat1 === lat2 && lon1 === lon2) {
    return '0.0';
  }
  const radlat1 = (Math.PI * lat1) / 180;
  const radlat2 = (Math.PI * lat2) / 180;
  const theta = lon1 - lon2;
  const radtheta = (Math.PI * theta) / 180;
  let dist =
    Math.sin(radlat1) * Math.sin(radlat2) +
    Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  if (dist > 1) {
    dist = 1;
  }
  dist = Math.acos(dist);
  dist = (dist * 180) / Math.PI;
  dist = dist * 60 * 1.1515; // Miles
  return dist.toFixed(1);
};
