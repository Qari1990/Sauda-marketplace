import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Backend, Session } from './types';
import type { Conversation, Deal, Listing, Message, Offer, Profile, PublicOffer } from '../types';
import { computeInsight } from '../rules';

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, ''));
}

const LISTING_SELECT = '*, seller:profiles!listings_seller_id_fkey(*)';

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });

  let cachedUid: string | null = null;
  const toSession = (s: { user: { id: string; phone?: string } } | null): Session | null => {
    cachedUid = s?.user.id ?? null;
    return s ? { userId: s.user.id, phone: s.user.phone ?? '' } : null;
  };
  const uid = () => {
    if (!cachedUid) throw new Error('Please log in first.');
    return cachedUid;
  };

  async function withSummaries(ls: Listing[]): Promise<Listing[]> {
    if (!ls.length) return ls;
    const { data, error } = await sb.rpc('listing_offer_summary', { p_ids: ls.map(l => l.id) });
    fail(error);
    const m = new Map<string, { offer_count: number; top_offer: number; next_expiry: string }>((data ?? []).map((r: any) => [r.listing_id, r]));
    return ls.map(l => ({ ...l, offer_count: m.get(l.id)?.offer_count ?? 0, top_offer: m.get(l.id)?.top_offer ?? null, next_expiry: m.get(l.id)?.next_expiry ?? null }));
  }

  async function uploadPhoto(uri: string, i: number): Promise<string> {
    if (/^https?:\/\//.test(uri)) return uri;
    const res = await fetch(uri);
    const blob = await res.arrayBuffer();
    const path = `${uid()}/${Date.now()}_${i}.jpg`;
    const { error } = await sb.storage.from('listing-photos').upload(path, blob, { contentType: 'image/jpeg' });
    fail(error);
    return sb.storage.from('listing-photos').getPublicUrl(path).data.publicUrl;
  }

  const dealSelect = '*, listing:listings(*), seller:profiles!deals_seller_id_fkey(*), buyer:profiles!deals_buyer_id_fkey(*)';

  return {
    mode: 'supabase',

    async getSession() {
      const { data } = await sb.auth.getSession();
      return toSession(data.session);
    },
    async sendOtp(phone) {
      const { error } = await sb.auth.signInWithOtp({ phone });
      fail(error);
    },
    async verifyOtp(phone, token) {
      const { data, error } = await sb.auth.verifyOtp({ phone, token, type: 'sms' });
      fail(error);
      return toSession(data.session)!;
    },
    async signOut() {
      await sb.auth.signOut();
      cachedUid = null;
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => cb(toSession(s)));
      return () => data.subscription.unsubscribe();
    },

    async getProfile(id) {
      const { data, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
      fail(error);
      return data as Profile | null;
    },
    async updateMyProfile(patch) {
      const { data, error } = await sb.from('profiles').update(patch).eq('id', uid()).select().single();
      fail(error);
      return data as Profile;
    },
    async getReviews(userId) {
      const { data, error } = await sb.from('reviews')
        .select('*, reviewer:profiles!reviews_reviewer_id_fkey(*)')
        .eq('reviewee_id', userId).order('created_at', { ascending: false });
      fail(error);
      return data ?? [];
    },

    async listListings(f) {
      let q = sb.from('listings').select(LISTING_SELECT).limit(60);
      if (!f.includeInactive) q = q.in('status', ['active', 'reserved']);
      if (f.sellerId) q = q.eq('seller_id', f.sellerId);
      if (f.category) q = q.eq('category', f.category);
      if (f.city) q = q.eq('city', f.city);
      if (f.condition) q = q.eq('condition', f.condition);
      if (f.minPrice != null) q = q.gte('price', f.minPrice);
      if (f.maxPrice != null) q = q.lte('price', f.maxPrice);
      if (f.q?.trim()) {
        const t = f.q.trim().replace(/[%,()]/g, ' ');
        q = q.or(`title.ilike.%${t}%,description.ilike.%${t}%,area.ilike.%${t}%`);
      }
      if (f.sort === 'price_asc') q = q.order('price', { ascending: true });
      else if (f.sort === 'price_desc') q = q.order('price', { ascending: false });
      else q = q.order('featured_until', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
      const { data, error } = await q;
      fail(error);
      let out = await withSummaries((data ?? []) as Listing[]);
      const nowIso = new Date().toISOString();
      if (!f.sort || f.sort === 'newest') {
        const ft = (l: Listing) => (l.featured_until && l.featured_until > nowIso ? 1 : 0);
        out = out.sort((a, b) => ft(b) - ft(a) || b.created_at.localeCompare(a.created_at));
      }
      if (f.sort === 'most_offers') out = out.sort((a, b) => (b.offer_count ?? 0) - (a.offer_count ?? 0));
      return out;
    },
    async getListing(id) {
      const { data, error } = await sb.from('listings').select(LISTING_SELECT).eq('id', id).maybeSingle();
      fail(error);
      return data ? (await withSummaries([data as Listing]))[0] : null;
    },
    async createListing(nl) {
      const photos = await Promise.all(nl.photos.map(uploadPhoto));
      const { data, error } = await sb.from('listings').insert({ ...nl, photos }).select(LISTING_SELECT).single();
      fail(error);
      return data as Listing;
    },
    async updateListingStatus(id, status) {
      const { error } = await sb.from('listings').update({ status }).eq('id', id);
      fail(error);
    },
    async recordView(id) {
      await sb.rpc('record_view', { p_listing: id });
    },
    async priceInsight(category, title, excludeId) {
      const { data, error } = await sb.from('listings').select('id,title,category,price')
        .eq('category', category).neq('id', excludeId ?? '00000000-0000-0000-0000-000000000000').limit(300);
      fail(error);
      return computeInsight({ category, title }, (data ?? []) as Listing[]);
    },
    async reportListing(id, reason) {
      const { error } = await sb.from('reports').insert({ listing_id: id, reason });
      fail(error);
    },

    async liveFeed(limit = 20) {
      const { data, error } = await sb.rpc('live_offer_feed', { p_limit: limit });
      fail(error);
      return (data ?? []) as any;
    },

    async listSaved() {
      const { data, error } = await sb.from('saved_listings').select(`listing:listings(${LISTING_SELECT})`)
        .order('created_at', { ascending: false });
      fail(error);
      return withSummaries((data ?? []).map((r: any) => r.listing).filter(Boolean));
    },
    async savedIds() {
      if (!cachedUid) return [];
      const { data } = await sb.from('saved_listings').select('listing_id');
      return (data ?? []).map((r: any) => r.listing_id);
    },
    async toggleSaved(listingId) {
      const { data } = await sb.from('saved_listings').select('listing_id').eq('listing_id', listingId).maybeSingle();
      if (data) {
        const { error } = await sb.from('saved_listings').delete().eq('listing_id', listingId).eq('user_id', uid());
        fail(error);
        return false;
      }
      const { error } = await sb.from('saved_listings').insert({ listing_id: listingId });
      fail(error);
      return true;
    },

    async getOfferBoard(listingId) {
      const { data, error } = await sb.rpc('public_offer_board', { p_listing: listingId });
      fail(error);
      return (data ?? []) as PublicOffer[];
    },
    async makeOffer(listingId, amount, hours, message) {
      const { data, error } = await sb.rpc('make_offer', { p_listing: listingId, p_amount: amount, p_hours: hours, p_message: message });
      fail(error);
      return data as Offer;
    },
    async withdrawOffer(offerId) {
      const { error } = await sb.rpc('withdraw_offer', { p_offer: offerId });
      fail(error);
    },
    async respondOffer(offerId, action, counter) {
      const { data, error } = await sb.rpc('respond_offer', { p_offer: offerId, p_action: action, p_counter: counter ?? null });
      fail(error);
      return (data && (data as Deal).id ? data : null) as Deal | null;
    },
    async myOffersSent() {
      const { data, error } = await sb.from('offers').select(`*, listing:listings(${LISTING_SELECT})`)
        .eq('buyer_id', uid()).order('created_at', { ascending: false });
      fail(error);
      return (data ?? []) as Offer[];
    },
    async myOffersReceived() {
      const { data, error } = await sb.from('offers')
        .select(`*, listing:listings(${LISTING_SELECT}), buyer:profiles!offers_buyer_id_fkey(*)`)
        .eq('seller_id', uid()).order('created_at', { ascending: false });
      fail(error);
      return (data ?? []) as Offer[];
    },

    async myDeals() {
      const me = uid();
      const [{ data, error }, { data: revs }] = await Promise.all([
        sb.from('deals').select(dealSelect).or(`buyer_id.eq.${me},seller_id.eq.${me}`).order('created_at', { ascending: false }),
        sb.from('reviews').select('deal_id').eq('reviewer_id', me),
      ]);
      fail(error);
      const done = new Set((revs ?? []).map((r: any) => r.deal_id));
      return ((data ?? []) as Deal[]).map(d => ({ ...d, my_review_done: done.has(d.id) }));
    },
    async getDeal(id) {
      const { data, error } = await sb.from('deals').select(dealSelect).eq('id', id).maybeSingle();
      fail(error);
      if (!data) return null;
      const { data: r } = await sb.from('reviews').select('id').eq('deal_id', id).eq('reviewer_id', uid()).maybeSingle();
      return { ...(data as Deal), my_review_done: !!r };
    },
    async revealPhone(dealId) {
      const { data, error } = await sb.rpc('reveal_phone', { p_deal: dealId });
      fail(error);
      return data as string;
    },
    async getRevealLog(dealId) {
      const { data, error } = await sb.from('phone_reveals').select('*, viewer:profiles(name)')
        .eq('deal_id', dealId).order('created_at', { ascending: false });
      fail(error);
      return (data ?? []).map((r: any) => ({ ...r, viewer_name: r.viewer?.name || 'User' }));
    },
    async confirmDeal(dealId) {
      const { error } = await sb.rpc('confirm_deal', { p_deal: dealId });
      fail(error);
    },
    async cancelDeal(dealId) {
      const { error } = await sb.rpc('cancel_deal', { p_deal: dealId });
      fail(error);
    },
    async leaveReview(dealId, stars, text) {
      const { error } = await sb.rpc('leave_review', { p_deal: dealId, p_stars: stars, p_text: text });
      fail(error);
    },

    async openConversation(listingId) {
      const { data, error } = await sb.rpc('open_conversation', { p_listing: listingId });
      fail(error);
      return data as Conversation;
    },
    async listConversations() {
      const me = uid();
      const { data, error } = await sb.from('conversations')
        .select('*, listing:listings(*), buyer:profiles!conversations_buyer_id_fkey(*), seller:profiles!conversations_seller_id_fkey(*)')
        .or(`buyer_id.eq.${me},seller_id.eq.${me}`).order('last_at', { ascending: false });
      fail(error);
      return (data ?? []).map((c: any) => ({ ...c, other: c.buyer_id === me ? c.seller : c.buyer }));
    },
    async getConversation(id) {
      const me = uid();
      const { data, error } = await sb.from('conversations')
        .select('*, listing:listings(*), buyer:profiles!conversations_buyer_id_fkey(*), seller:profiles!conversations_seller_id_fkey(*)')
        .eq('id', id).maybeSingle();
      fail(error);
      return data ? { ...(data as any), other: data.buyer_id === me ? data.seller : data.buyer } : null;
    },
    async listMessages(conversationId) {
      const { data, error } = await sb.from('messages').select('*').eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }).limit(500);
      fail(error);
      return (data ?? []) as Message[];
    },
    async sendMessage(conversationId, body) {
      const { data, error } = await sb.from('messages').insert({ conversation_id: conversationId, body: body.trim() }).select().single();
      fail(error);
      return data as Message;
    },
    subscribeMessages(conversationId, cb) {
      const ch = sb.channel(`chat:${conversationId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
          p => cb(p.new as Message))
        .subscribe();
      return () => { sb.removeChannel(ch); };
    },
  };
}
