// ─── Enums ────────────────────────────────────────────────────────────────────

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'completed';

export type NotificationType =
  | 'follow'
  | 'like'
  | 'comment'
  | 'booking'
  | 'message';

// ─── Core Table Types ─────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  full_name?: string;
  name: string | null;
  avatar_url: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  is_artist: boolean;
  styles: string[] | null;
  booking_status: boolean | null;
  booked_until: string | null;
  booking_link: string | null;
  studio_name: string | null;
  general_availability: Record<string, unknown> | null;
  location: string | null;
  location_thumbnail_url: string | null;
  lat: number | null;
  lng: number | null;
  latitude: number | null;
  longitude: number | null;
  last_active: string | null;
  follower_count: number;
  following_count: number;
  portfolio_count: number;
  review_count: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface PortfolioImage {
  id: string;
  artist_id: string;
  image_url: string;
  cloudinary_url: string;
  public_id: string;
  caption: string | null;
  display_order: number;
  created_at: string;
  user_id?: string;
}

export interface ImageTag {
  id: string;
  image_id: string;
  tagged_user_id: string | null;
  tag_text: string;
  x_pos: number;
  y_pos: number;
}

export interface Review {
  id: string;
  artist_id: string;
  reviewer_id: string;
  stars: number;
  rating?: number;
  comment: string | null;
  created_at: string;
  reviewer?: Pick<Profile, 'id' | 'name' | 'username' | 'profile_photo_url'>;
}

export interface Booking {
  id: string;
  client_id: string;
  artist_id: string;
  service_description: string;
  status: BookingStatus;
  scheduled_date: string | null;
  duration_minutes: number | null;
  reference_images: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  artist?: Pick<Profile, 'id' | 'name' | 'username' | 'profile_photo_url'>;
  client?: Pick<Profile, 'id' | 'name' | 'username' | 'profile_photo_url'>;
}

export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string | null;
  created_at: string;
  other_user?: Pick<Profile, 'id' | 'name' | 'username' | 'profile_photo_url' | 'is_artist'>;
  last_message?: string | null;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  image_url: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  image_url: string | null;
  public_id: string | null;
  created_at: string;
  updated_at: string;
  author?: Pick<Profile, 'id' | 'name' | 'username' | 'profile_photo_url' | 'is_artist'>;
  likes_count?: number;
  comments_count?: number;
}

export interface ArtistDeal {
  id: string;
  artist_id: string;
  title: string;
  description: string;
  image_url: string | null;
  public_id: string | null;
  valid_until: string | null;
  created_at: string;
}

export interface ConventionDate {
  id: string;
  artist_id: string;
  convention_name: string;
  event_name?: string;
  location: string;
  booth_info: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
}

// ─── Platform Extension Types (upcoming features) ────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: Pick<Profile, 'id' | 'name' | 'username' | 'profile_photo_url'>;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: Pick<Profile, 'id' | 'name' | 'username' | 'profile_photo_url'>;
}

export interface SavedArtist {
  id: string;
  user_id: string;
  artist_id: string;
  created_at: string;
  artist?: Pick<Profile, 'id' | 'name' | 'username' | 'profile_photo_url' | 'styles' | 'location' | 'average_rating'>;
}
