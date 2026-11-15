import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Backend, Session } from './types';
import type {
  Conversation, Deal, Listing, ListingFilters, Message, Offer, PhoneReveal, Profile, Review,
} from '../types';
import { seedListings, seedOffers, seedPhones, seedProfiles, seedReviews } from '../seed';
import { computeInsight, effectiveStatus, isOpen, maskedBuyerLabels, validateOffer } from '../rules';
import { prettyPhone } from '../format';

/**
 * Demo backend: the whole marketplace runs on this device with sample data.
 * It follows the same rules as the real database so the app behaves the same.
 * Other people are simulated: sellers reply to your offers, buyers make offers on your ads.
 */

const KEY = 'sauda.demo.v1';
const DEMO_OTP = '123456';

interface State {
  session: Session | null;
  profiles: Profile[];
  phones: Record<string, string>;
  listings: Listing[];
  offers: Offer[];
  deals: Deal[];
  reveals: PhoneReveal[];
  convos: Conversation[];
  messages: Message[];
  reviews: Review[];
  saved: Record<string, string[]>;
  reports: { listing_id: string; by: string; reason: string }[];
}

const fresh = (): State => ({
  session: null,
  profiles: structuredClone(seedProfiles),
  phones: { ...seedPhones },
  listings: structuredClone(seedListings),
  offers: structuredClone(seedOffers),
  deals: [], reveals: [], convos: [], messages: [],
  reviews: structuredClone(seedReviews),
  saved: {}, reports: [],
});

let state: State | null = null;
const authListeners = new Set<(s: Session | null) => void>();
const msgListeners = new Map<string, Set<(m: Message) => void>>();
const changeListeners = new Set<() => void>();

/** UI can subscribe to "something changed" to refresh (used for simulated replies). */
export function onDemoChange(cb: () => void) {
  changeListeners.add(cb);
  return () => { changeListeners.delete(cb); };
}

async function load(): Promise<State> {
  if (state) return state;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as State) : fresh();
  } catch {
    state = fresh();
  }
  return state;
}
async function save() {
  // Storage can be unavailable (private mode, sandboxed frames): keep working in memory.
  if (state) await AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  changeListeners.forEach(cb => cb());
}

export async function resetDemo() {
  state = fresh();
  await save();
  authListeners.forEach(cb => cb(null));
}

const SIM_IDS = new Set(seedProfiles.map(p => p.id));
const isSim = (uid: string) => SIM_IDS.has(uid);
const id = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const nowIso = () => new Date().toISOString();

function me(s: State) {
  if (!s.session) throw new Error('Please log in first.');
  return s.session.userId;
}
function profile(s: State, uid: string) {
  return s.profiles.find(p => p.id === uid);
}
function withSummary(s: State, l: Listing): Listing {
  const open = s.offers.filter(o => o.listing_id === l.id && isOpen(o));
  return {
    ...l,
    seller: profile(s, l.seller_id),
    offer_count: open.length,
    top_offer: open.length ? Math.max(...open.map(o => o.amount)) : null,
    next_expiry: open.length ? open.map(o => o.expires_at).sort()[0] : null,
  };
}
function expireOffers(s: State) {
  s.offers.forEach(o => { o.status = effectiveStatus(o); });
}
function recomputeRating(s: State, uid: string) {
  const p = profile(s, uid);
  if (!p) return;
  const rs = s.reviews.filter(r => r.reviewee_id === uid);
  p.rating_count = rs.length;
  p.rating_avg = rs.length ? Math.round((rs.reduce((a, r) => a + r.stars, 0) / rs.length) * 10) / 10 : null;
}

function createDeal(s: State, o: Offer, price: number): Deal {
  const l = s.listings.find(x => x.id === o.listing_id)!;
  o.status = 'accepted';
  l.status = 'reserved';
  const d: Deal = {
    id: id('d'), listing_id: l.id, offer_id: o.id, seller_id: o.seller_id, buyer_id: o.buyer_id,
    price, status: 'agreed', seller_confirmed: false, buyer_confirmed: false,
    cancelled_by: null, created_at: nowIso(), completed_at: null,
  };
  s.deals.push(d);
  return d;
}

function later(ms: number, fn: (s: State) => void) {
  setTimeout(async () => {
    const s = await load();
    fn(s);
    await save();
  }, ms);
}

function ensureConvo(s: State, listingId: string, buyerId: string): Conversation {
  const l = s.listings.find(x => x.id === listingId)!;
  let c = s.convos.find(x => x.listing_id === listingId && x.buyer_id === buyerId);
  if (!c) {
    c = { id: id('c'), listing_id: listingId, buyer_id: buyerId, seller_id: l.seller_id, last_message: null, last_at: nowIso() };
    s.convos.push(c);
  }
  return c;
}
function pushMessage(s: State, c: Conversation, sender: string, body: string) {
  const m: Message = { id: id('m'), conversation_id: c.id, sender_id: sender, body, created_at: nowIso() };
  s.messages.push(m);
  c.last_message = body;
  c.last_at = m.created_at;
  msgListeners.get(c.id)?.forEach(cb => cb(m));
  return m;
}

const SIM_REPLIES = [
  'Assalam o Alaikum! Yes, it is available.',
  'Item is in very good condition, you can check it yourself.',
  'Please send your best price as an offer, I will review it.',
  'I am available after 5 pm for viewing.',
];

export function createDemoBackend(): Backend {
  return {
    mode: 'demo',

    async getSession() { return (await load()).session; },
    async sendOtp() { /* demo: code is always 123456 */ },
    async verifyOtp(phone, code) {
      const s = await load();
      if (code !== DEMO_OTP) throw new Error('Wrong code. In demo mode the code is 123456.');
      let uid = Object.keys(s.phones).find(k => s.phones[k] === prettyPhone(phone));
      if (!uid) {
        uid = id('u');
        s.phones[uid] = prettyPhone(phone);
        s.profiles.push({
          id: uid, name: '', city: 'Lahore', avatar_url: null, phone_verified: true, cnic_verified: false,
          deals_completed: 0, backouts: 0, rating_avg: null, rating_count: 0, created_at: nowIso(),
          last_seen_at: nowIso(), show_last_seen: true,
        });
      }
      s.session = { userId: uid, phone };
      await save();
      authListeners.forEach(cb => cb(s.session));
      return s.session;
    },
    async signOut() {
      const s = await load();
      s.session = null;
      await save();
      authListeners.forEach(cb => cb(null));
    },
    onAuthChange(cb) {
      authListeners.add(cb);
      return () => { authListeners.delete(cb); };
    },

    async getProfile(uid) { return profile(await load(), uid) ?? null; },
    async updateMyProfile(patch) {
      const s = await load();
      const p = profile(s, me(s))!;
      Object.assign(p, patch);
      await save();
      return p;
    },
    async getReviews(uid) {
      const s = await load();
      return s.reviews.filter(r => r.reviewee_id === uid)
        .map(r => ({ ...r, reviewer: profile(s, r.reviewer_id) }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async listListings(f: ListingFilters) {
      const s = await load();
      expireOffers(s);
      const q = f.q?.trim().toLowerCase();
      let out = s.listings.filter(l =>
        (f.includeInactive || l.status === 'active' || l.status === 'reserved') &&
        (!f.sellerId || l.seller_id === f.sellerId) &&
        (!f.category || l.category === f.category) &&
        (!f.city || l.city === f.city) &&
        (!f.condition || l.condition === f.condition) &&
        (f.minPrice == null || l.price >= f.minPrice) &&
        (f.maxPrice == null || l.price <= f.maxPrice) &&
        (!q || `${l.title} ${l.description} ${l.area}`.toLowerCase().includes(q)),
      ).map(l => withSummary(s, l));
      const featured = (l: Listing) => (l.featured_until && l.featured_until > nowIso() ? 1 : 0);
      out.sort((a, b) => {
        switch (f.sort) {
          case 'price_asc': return a.price - b.price;
          case 'price_desc': return b.price - a.price;
          case 'most_offers': return (b.offer_count ?? 0) - (a.offer_count ?? 0);
          default: return featured(b) - featured(a) || b.created_at.localeCompare(a.created_at);
        }
      });
      return out;
    },
    async getListing(lid) {
      const s = await load();
      expireOffers(s);
      const l = s.listings.find(x => x.id === lid);
      return l ? withSummary(s, l) : null;
    },
    async createListing(nl) {
      const s = await load();
      const uid = me(s);
      const l: Listing = {
        id: id('l'), seller_id: uid, ...nl, status: 'active', featured_until: null, views: 0, created_at: nowIso(),
      };
      s.listings.unshift(l);
      await save();
      // Simulated interest: a buyer sends an offer shortly after you post.
      const buyers = s.profiles.filter(p => isSim(p.id));
      later(6000, st => {
        const b = buyers[Math.floor(Math.random() * buyers.length)];
        const cur = st.listings.find(x => x.id === l.id);
        if (!cur || cur.status !== 'active' || !b) return;
        st.offers.push({
          id: id('o'), listing_id: l.id, buyer_id: b.id, seller_id: uid,
          amount: Math.round((l.price * 0.85) / 500) * 500, message: 'Is this still available? Final price?',
          counter_amount: null, status: 'pending', created_at: nowIso(), expires_at: new Date(Date.now() + 12 * 3600_000).toISOString(),
        });
      });
      return withSummary(s, l);
    },
    async updateListingStatus(lid, status) {
      const s = await load();
      const l = s.listings.find(x => x.id === lid);
      if (!l || l.seller_id !== me(s)) throw new Error('Only the seller can change this ad.');
      l.status = status;
      await save();
    },
    async recordView(lid) {
      const s = await load();
      const l = s.listings.find(x => x.id === lid);
      if (l && l.seller_id !== s.session?.userId) { l.views++; await save(); }
    },
    async priceInsight(category, title, excludeId) {
      const s = await load();
      return computeInsight({ category, title }, s.listings.filter(l => l.id !== excludeId));
    },
    async reportListing(lid, reason) {
      const s = await load();
      s.reports.push({ listing_id: lid, by: me(s), reason });
      await save();
    },

    async liveFeed(limit = 20) {
      const s = await load();
      return [...s.offers].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit).map(o => {
        const l = s.listings.find(x => x.id === o.listing_id)!;
        return { id: o.id, listing_id: l.id, title: l.title, category: l.category, amount: o.amount, asking: l.price, created_at: o.created_at };
      });
    },

    async listSaved() {
      const s = await load();
      const ids = s.saved[me(s)] ?? [];
      return s.listings.filter(l => ids.includes(l.id)).map(l => withSummary(s, l));
    },
    async savedIds() {
      const s = await load();
      return s.session ? s.saved[s.session.userId] ?? [] : [];
    },
    async toggleSaved(lid) {
      const s = await load();
      const uid = me(s);
      const cur = new Set(s.saved[uid] ?? []);
      const nowSaved = !cur.has(lid);
      nowSaved ? cur.add(lid) : cur.delete(lid);
      s.saved[uid] = [...cur];
      await save();
      return nowSaved;
    },

    async getOfferBoard(lid) {
      const s = await load();
      expireOffers(s);
      const all = s.offers.filter(o => o.listing_id === lid);
      const labels = maskedBuyerLabels(all);
      const uid = s.session?.userId;
      return all
        .map(o => {
          const b = profile(s, o.buyer_id);
          return {
            id: o.id, listing_id: o.listing_id, amount: o.amount, counter_amount: o.counter_amount,
            status: o.status, expires_at: o.expires_at, created_at: o.created_at,
            buyer_label: labels.get(o.buyer_id)!, buyer_verified: !!b?.cnic_verified,
            buyer_deals: b?.deals_completed ?? 0, is_mine: o.buyer_id === uid,
          };
        })
        .sort((a, b) => b.amount - a.amount);
    },
    async makeOffer(lid, amount, hours, message) {
      const s = await load();
      const uid = me(s);
      expireOffers(s);
      const l = s.listings.find(x => x.id === lid);
      if (!l) throw new Error('Ad not found.');
      if (l.seller_id === uid) throw new Error('You cannot make an offer on your own ad.');
      const err = validateOffer(l, amount, hours);
      if (err) throw new Error(err);
      if (s.offers.some(o => o.listing_id === lid && o.buyer_id === uid && isOpen(o))) {
        throw new Error('You already have an open offer here. Withdraw it first to send a new one.');
      }
      const o: Offer = {
        id: id('o'), listing_id: lid, buyer_id: uid, seller_id: l.seller_id, amount, message,
        counter_amount: null, status: 'pending', created_at: nowIso(),
        expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
      };
      s.offers.push(o);
      await save();
      // Simulated seller decision.
      if (isSim(l.seller_id)) {
        later(5000, st => {
          const cur = st.offers.find(x => x.id === o.id);
          if (!cur || effectiveStatus(cur) !== 'pending') return;
          const ratio = cur.amount / l.price;
          if (ratio >= 0.92) createDeal(st, cur, cur.amount);
          else if (ratio >= 0.7) {
            cur.status = 'countered';
            cur.counter_amount = Math.round(((cur.amount + l.price) / 2) / 500) * 500;
          } else cur.status = 'rejected';
        });
      }
      return o;
    },
    async withdrawOffer(oid) {
      const s = await load();
      const o = s.offers.find(x => x.id === oid);
      if (!o || o.buyer_id !== me(s)) throw new Error('Offer not found.');
      if (!isOpen(o)) throw new Error('This offer is already closed.');
      o.status = 'withdrawn';
      await save();
    },
    async respondOffer(oid, action, counterAmount) {
      const s = await load();
      const uid = me(s);
      expireOffers(s);
      const o = s.offers.find(x => x.id === oid);
      if (!o) throw new Error('Offer not found.');
      const l = s.listings.find(x => x.id === o.listing_id)!;
      if (!isOpen(o)) throw new Error('This offer has expired or is already closed.');
      if (l.status !== 'active') throw new Error('This ad already has a deal in progress.');
      let deal: Deal | null = null;
      if (action === 'accept_counter') {
        if (o.buyer_id !== uid || o.status !== 'countered') throw new Error('Nothing to accept.');
        deal = createDeal(s, o, o.counter_amount!);
      } else {
        if (o.seller_id !== uid) throw new Error('Only the seller can respond.');
        if (action === 'accept') deal = createDeal(s, o, o.status === 'countered' ? o.counter_amount! : o.amount);
        else if (action === 'reject') o.status = 'rejected';
        else {
          if (!counterAmount || counterAmount <= o.amount) throw new Error('Counter must be higher than the offer.');
          o.status = 'countered';
          o.counter_amount = counterAmount;
          // simulated buyer accepts counters within 15% of their offer
          if (isSim(o.buyer_id)) {
            later(5000, st => {
              const cur = st.offers.find(x => x.id === oid);
              const li = st.listings.find(x => x.id === cur?.listing_id);
              if (cur && li?.status === 'active' && effectiveStatus(cur) === 'countered' && counterAmount <= cur.amount * 1.15) {
                createDeal(st, cur, counterAmount);
              }
            });
          }
        }
      }
      await save();
      return deal;
    },
    async myOffersSent() {
      const s = await load();
      expireOffers(s);
      const uid = me(s);
      return s.offers.filter(o => o.buyer_id === uid)
        .map(o => ({ ...o, listing: withSummary(s, s.listings.find(l => l.id === o.listing_id)!) }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async myOffersReceived() {
      const s = await load();
      expireOffers(s);
      const uid = me(s);
      return s.offers.filter(o => o.seller_id === uid)
        .map(o => ({ ...o, listing: withSummary(s, s.listings.find(l => l.id === o.listing_id)!), buyer: profile(s, o.buyer_id) }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async myDeals() {
      const s = await load();
      const uid = me(s);
      return s.deals.filter(d => d.buyer_id === uid || d.seller_id === uid)
        .map(d => ({
          ...d, listing: s.listings.find(l => l.id === d.listing_id),
          seller: profile(s, d.seller_id), buyer: profile(s, d.buyer_id),
          my_review_done: s.reviews.some(r => r.deal_id === d.id && r.reviewer_id === uid),
        }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async getDeal(did) {
      const s = await load();
      const uid = me(s);
      const d = s.deals.find(x => x.id === did);
      if (!d || (d.buyer_id !== uid && d.seller_id !== uid)) return null;
      return {
        ...d, listing: s.listings.find(l => l.id === d.listing_id),
        seller: profile(s, d.seller_id), buyer: profile(s, d.buyer_id),
        my_review_done: s.reviews.some(r => r.deal_id === d.id && r.reviewer_id === uid),
      };
    },
    async revealPhone(did) {
      const s = await load();
      const uid = me(s);
      const d = s.deals.find(x => x.id === did);
      if (!d || (d.buyer_id !== uid && d.seller_id !== uid)) throw new Error('Not your deal.');
      if (d.status === 'cancelled') throw new Error('This deal was cancelled, numbers are hidden again.');
      const other = d.buyer_id === uid ? d.seller_id : d.buyer_id;
      s.reveals.push({ id: id('pr'), deal_id: did, viewer_id: uid, viewer_name: profile(s, uid)?.name || 'You', created_at: nowIso() });
      await save();
      return s.phones[other] ?? 'Not available';
    },
    async getRevealLog(did) {
      const s = await load();
      return s.reveals.filter(r => r.deal_id === did).sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async confirmDeal(did) {
      const s = await load();
      const uid = me(s);
      const d = s.deals.find(x => x.id === did);
      if (!d || d.status !== 'agreed') throw new Error('Deal cannot be confirmed.');
      if (d.buyer_id === uid) d.buyer_confirmed = true;
      else if (d.seller_id === uid) d.seller_confirmed = true;
      else throw new Error('Not your deal.');
      const finish = (st: State) => {
        const dd = st.deals.find(x => x.id === did)!;
        if (dd.status !== 'agreed' || !dd.buyer_confirmed || !dd.seller_confirmed) return;
        dd.status = 'completed';
        dd.completed_at = nowIso();
        const l = st.listings.find(x => x.id === dd.listing_id);
        if (l) l.status = 'sold';
        [dd.buyer_id, dd.seller_id].forEach(p => { const pr = profile(st, p); if (pr) pr.deals_completed++; });
      };
      finish(s);
      await save();
      // simulated counterparty confirms too
      const other = d.buyer_id === uid ? d.seller_id : d.buyer_id;
      if (isSim(other)) later(3000, st => {
        const dd = st.deals.find(x => x.id === did)!;
        if (dd.buyer_id === other) dd.buyer_confirmed = true; else dd.seller_confirmed = true;
        finish(st);
      });
    },
    async cancelDeal(did) {
      const s = await load();
      const uid = me(s);
      const d = s.deals.find(x => x.id === did);
      if (!d || d.status !== 'agreed' || (d.buyer_id !== uid && d.seller_id !== uid)) throw new Error('Deal cannot be cancelled.');
      d.status = 'cancelled';
      d.cancelled_by = uid;
      const p = profile(s, uid);
      if (p) p.backouts++;
      const l = s.listings.find(x => x.id === d.listing_id);
      if (l && l.status === 'reserved') l.status = 'active';
      await save();
    },
    async leaveReview(did, stars, text) {
      const s = await load();
      const uid = me(s);
      const d = s.deals.find(x => x.id === did);
      if (!d || d.status !== 'completed') throw new Error('You can rate only after the deal is completed.');
      if (s.reviews.some(r => r.deal_id === did && r.reviewer_id === uid)) throw new Error('You already rated this deal.');
      const reviewee = d.buyer_id === uid ? d.seller_id : d.buyer_id;
      s.reviews.push({ id: id('r'), deal_id: did, reviewer_id: uid, reviewee_id: reviewee, stars, text, created_at: nowIso() });
      recomputeRating(s, reviewee);
      await save();
    },

    async openConversation(lid) {
      const s = await load();
      const uid = me(s);
      const l = s.listings.find(x => x.id === lid);
      if (!l) throw new Error('Ad not found.');
      if (l.seller_id === uid) throw new Error('This is your own ad.');
      const c = ensureConvo(s, lid, uid);
      await save();
      return c;
    },
    async listConversations() {
      const s = await load();
      const uid = me(s);
      return s.convos.filter(c => c.buyer_id === uid || c.seller_id === uid)
        .map(c => ({
          ...c, listing: s.listings.find(l => l.id === c.listing_id),
          other: profile(s, c.buyer_id === uid ? c.seller_id : c.buyer_id),
        }))
        .sort((a, b) => b.last_at.localeCompare(a.last_at));
    },
    async getConversation(cid) {
      const s = await load();
      const uid = me(s);
      const c = s.convos.find(x => x.id === cid);
      if (!c) return null;
      return { ...c, listing: s.listings.find(l => l.id === c.listing_id), other: profile(s, c.buyer_id === uid ? c.seller_id : c.buyer_id) };
    },
    async listMessages(cid) {
      const s = await load();
      return s.messages.filter(m => m.conversation_id === cid);
    },
    async sendMessage(cid, body) {
      const s = await load();
      const uid = me(s);
      const c = s.convos.find(x => x.id === cid);
      if (!c) throw new Error('Chat not found.');
      const m = pushMessage(s, c, uid, body.trim());
      await save();
      const other = c.buyer_id === uid ? c.seller_id : c.buyer_id;
      if (isSim(other)) {
        const n = s.messages.filter(x => x.conversation_id === cid && x.sender_id === other).length;
        later(2500, st => {
          const cc = st.convos.find(x => x.id === cid)!;
          pushMessage(st, cc, other, SIM_REPLIES[n % SIM_REPLIES.length]);
        });
      }
      return m;
    },
    subscribeMessages(cid, cb) {
      if (!msgListeners.has(cid)) msgListeners.set(cid, new Set());
      msgListeners.get(cid)!.add(cb);
      return () => { msgListeners.get(cid)?.delete(cb); };
    },
  };
}
