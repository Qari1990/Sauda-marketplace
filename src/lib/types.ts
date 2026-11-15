export type Category =
  | 'mobiles' | 'vehicles' | 'bikes' | 'property' | 'electronics'
  | 'home' | 'fashion' | 'jobs' | 'animals' | 'other';

export type Condition = 'new' | 'like_new' | 'used' | 'for_parts';

export type ListingStatus = 'active' | 'reserved' | 'sold' | 'paused';

export interface Profile {
  id: string;
  name: string;
  city: string;
  avatar_url: string | null;
  phone_verified: boolean;
  cnic_verified: boolean;
  deals_completed: number;
  backouts: number;
  rating_avg: number | null;
  rating_count: number;
  created_at: string;
  last_seen_at: string | null;
  show_last_seen: boolean;
}

export interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  category: Category;
  condition: Condition;
  price: number;
  city: string;
  area: string;
  photos: string[];
  status: ListingStatus;
  featured_until: string | null;
  views: number;
  created_at: string;
  /** joined */
  seller?: Profile;
  /** summary of the public offer board */
  offer_count?: number;
  top_offer?: number | null;
}

export type OfferStatus = 'pending' | 'countered' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';

/** What everybody can see on a listing's offer board. Buyer identity is masked. */
export interface PublicOffer {
  id: string;
  listing_id: string;
  amount: number;
  counter_amount: number | null;
  status: OfferStatus;
  expires_at: string;
  created_at: string;
  buyer_label: string; // e.g. "Buyer 3"
  buyer_verified: boolean;
  buyer_deals: number;
  is_mine: boolean;
}

/** Full offer, only visible to the buyer who sent it and the seller. */
export interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  message: string;
  counter_amount: number | null;
  status: OfferStatus;
  expires_at: string;
  created_at: string;
  listing?: Listing;
  buyer?: Profile;
}

export type DealStatus = 'agreed' | 'completed' | 'cancelled';

export interface Deal {
  id: string;
  listing_id: string;
  offer_id: string;
  seller_id: string;
  buyer_id: string;
  price: number;
  status: DealStatus;
  seller_confirmed: boolean;
  buyer_confirmed: boolean;
  cancelled_by: string | null;
  created_at: string;
  completed_at: string | null;
  listing?: Listing;
  seller?: Profile;
  buyer?: Profile;
  my_review_done?: boolean;
}

export interface PhoneReveal {
  id: string;
  deal_id: string;
  viewer_id: string;
  viewer_name: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message: string | null;
  last_at: string;
  listing?: Listing;
  other?: Profile;
  unread?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface Review {
  id: string;
  deal_id: string;
  reviewer_id: string;
  reviewee_id: string;
  stars: number;
  text: string;
  created_at: string;
  reviewer?: Profile;
}

export interface ListingFilters {
  q?: string;
  category?: Category;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: Condition;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'most_offers';
  sellerId?: string;
  includeInactive?: boolean;
}

export interface PriceInsight {
  sample: number;
  low: number;
  median: number;
  high: number;
}

export interface NewListing {
  title: string;
  description: string;
  category: Category;
  condition: Condition;
  price: number;
  city: string;
  area: string;
  photos: string[]; // local URIs or data URLs; backend uploads
}
