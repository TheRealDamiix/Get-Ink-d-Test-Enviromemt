// Re-export all database types
export * from './database.types';

import type { User } from '@supabase/supabase-js';
import type { Profile } from './database.types';
/** AuthUser merges Supabase Auth user with DB profile fields */
export type AuthUser = User & Partial<Profile> & { profile?: Profile };

// ─── Utility Types ────────────────────────────────────────────────────────────

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// ─── Next.js-ready metadata (consumed by layout in Next.js, ignored in Vite) ─

export interface PageMeta {
  title: string;
  description?: string;
  ogImage?: string;
  noIndex?: boolean;
}

// ─── Cloudinary upload result ─────────────────────────────────────────────────

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

// ─── Search & filter types ────────────────────────────────────────────────────

export interface ArtistSearchFilters {
  query?: string;
  location?: string;
  lat?: number;
  lng?: number;
  styles?: string[];
  maxDistanceMiles?: number;
  bookingStatus?: boolean;
  minRating?: number;
}

// ─── Form data types ──────────────────────────────────────────────────────────

export interface ProfileFormData {
  name: string;
  username: string;
  bio: string;
  location: string;
  styles: string[];
  currentStyle: string;
  bookingStatus: boolean;
  bookedUntil: string;
  bookingLink: string;
  profilePhotoUrl: string;
  currentLatitude: number | null;
  currentLongitude: number | null;
  studio_name: string;
  locationThumbnailUrl: string;
}
