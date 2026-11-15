import type { Listing, Offer, OfferStatus, PriceInsight } from './types';

/** Offer lifetimes a buyer can choose from (hours). */
export const OFFER_HOURS = [2, 6, 12, 24, 48] as const;
/** Buyers cannot offer less than this share of the asking price (stops spam lowballs). */
export const MIN_OFFER_RATIO = 0.4;
export const MAX_OPEN_OFFERS_PER_LISTING = 1;

export function effectiveStatus(o: { status: OfferStatus; expires_at: string }): OfferStatus {
  if ((o.status === 'pending' || o.status === 'countered') && new Date(o.expires_at).getTime() <= Date.now()) {
    return 'expired';
  }
  return o.status;
}

export function isOpen(o: { status: OfferStatus; expires_at: string }) {
  const s = effectiveStatus(o);
  return s === 'pending' || s === 'countered';
}

export function validateOffer(listing: Listing, amount: number, hours: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter a valid amount.';
  if (amount < Math.ceil(listing.price * MIN_OFFER_RATIO)) {
    return `Offer must be at least ${Math.round(MIN_OFFER_RATIO * 100)}% of the asking price.`;
  }
  if (amount > listing.price * 1.5) return 'Offer is far above the asking price. Please check the amount.';
  if (!(OFFER_HOURS as readonly number[]).includes(hours)) return 'Choose how long the offer stays valid.';
  if (listing.status !== 'active') return 'This ad is not taking offers right now.';
  return null;
}

const STOP = new Set(['for', 'with', 'and', 'the', 'new', 'used', 'model', 'sale', 'in', 'of', '+']);
export function keywords(title: string): string[] {
  return title.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
}

/** Price check: compare against similar ads (same category, sharing title words). */
export function computeInsight(target: { category: string; title: string }, pool: Listing[]): PriceInsight | null {
  const kw = keywords(target.title);
  const scored = pool
    .filter(l => l.category === target.category)
    .map(l => ({ l, score: keywords(l.title).filter(w => kw.includes(w)).length }))
    .filter(x => x.score > 0)
    .map(x => x.l.price)
    .sort((a, b) => a - b);
  if (scored.length < 2) return null;
  const q = (p: number) => scored[Math.min(scored.length - 1, Math.floor(p * (scored.length - 1)))];
  return { sample: scored.length, low: q(0.1), median: q(0.5), high: q(0.9) };
}

export function maskedBuyerLabels(offers: Offer[]): Map<string, string> {
  // Stable numbering by first offer time so "Buyer 2" stays "Buyer 2".
  const order: string[] = [];
  [...offers].sort((a, b) => a.created_at.localeCompare(b.created_at)).forEach(o => {
    if (!order.includes(o.buyer_id)) order.push(o.buyer_id);
  });
  return new Map(order.map((id, i) => [id, `Buyer ${i + 1}`]));
}
