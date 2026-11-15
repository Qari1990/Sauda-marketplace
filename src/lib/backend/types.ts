import type {
  Conversation, Deal, Listing, ListingFilters, Message, NewListing, Offer,
  FeedItem, PhoneReveal, PriceInsight, Profile, PublicOffer, Review, Category,
} from '../types';

export interface Session {
  userId: string;
  phone: string;
}

/**
 * Everything the app needs from a server. There are two implementations:
 *  - demo: runs fully on the device with sample data (no accounts needed)
 *  - supabase: the real backend (Postgres + phone OTP + storage)
 * Business rules (offer expiry, who can see a phone number, etc.) are enforced
 * server-side in supabase/migrations; the demo backend mirrors the same rules.
 */
export interface Backend {
  mode: 'demo' | 'supabase';

  // auth
  getSession(): Promise<Session | null>;
  sendOtp(phone: string): Promise<void>;
  verifyOtp(phone: string, code: string): Promise<Session>;
  signOut(): Promise<void>;
  onAuthChange(cb: (s: Session | null) => void): () => void;

  // profiles
  getProfile(id: string): Promise<Profile | null>;
  updateMyProfile(patch: Partial<Pick<Profile, 'name' | 'city' | 'avatar_url' | 'show_last_seen'>>): Promise<Profile>;
  getReviews(userId: string): Promise<Review[]>;

  // listings
  listListings(f: ListingFilters): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | null>;
  createListing(l: NewListing): Promise<Listing>;
  updateListingStatus(id: string, status: Listing['status']): Promise<void>;
  recordView(id: string): Promise<void>;
  priceInsight(category: Category, title: string, excludeId?: string): Promise<PriceInsight | null>;
  reportListing(id: string, reason: string): Promise<void>;

  /** latest offers across the marketplace, for the live ticker */
  liveFeed(limit?: number): Promise<FeedItem[]>;

  // saved
  listSaved(): Promise<Listing[]>;
  savedIds(): Promise<string[]>;
  toggleSaved(listingId: string): Promise<boolean>;

  // offers
  getOfferBoard(listingId: string): Promise<PublicOffer[]>;
  makeOffer(listingId: string, amount: number, hours: number, message: string): Promise<Offer>;
  withdrawOffer(offerId: string): Promise<void>;
  /** seller: accept | reject | counter. buyer: accept_counter */
  respondOffer(offerId: string, action: 'accept' | 'reject' | 'counter' | 'accept_counter', counterAmount?: number): Promise<Deal | null>;
  myOffersSent(): Promise<Offer[]>;
  myOffersReceived(): Promise<Offer[]>;

  // deals
  myDeals(): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal | null>;
  /** returns the other party's phone and writes to the reveal log */
  revealPhone(dealId: string): Promise<string>;
  getRevealLog(dealId: string): Promise<PhoneReveal[]>;
  confirmDeal(dealId: string): Promise<void>;
  cancelDeal(dealId: string): Promise<void>;
  leaveReview(dealId: string, stars: number, text: string): Promise<void>;

  // chat
  openConversation(listingId: string): Promise<Conversation>;
  listConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | null>;
  listMessages(conversationId: string): Promise<Message[]>;
  sendMessage(conversationId: string, body: string): Promise<Message>;
  subscribeMessages(conversationId: string, cb: (m: Message) => void): () => void;
}
