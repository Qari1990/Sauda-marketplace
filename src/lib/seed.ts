import type { Category, Condition, Listing, Offer, Profile, Review } from './types';

const now = Date.now();
const h = 3600_000;
const iso = (ms: number) => new Date(ms).toISOString();

function person(id: string, name: string, city: string, o: Partial<Profile> = {}): Profile {
  return {
    id, name, city, avatar_url: null, phone_verified: true, cnic_verified: false,
    deals_completed: 0, backouts: 0, rating_avg: null, rating_count: 0,
    created_at: iso(now - 200 * 24 * h), last_seen_at: iso(now - 2 * h), show_last_seen: true, ...o,
  };
}

export const seedProfiles: Profile[] = [
  person('u_ahmed', 'Ahmed Raza', 'Lahore', { cnic_verified: true, deals_completed: 14, rating_avg: 4.8, rating_count: 12 }),
  person('u_sana', 'Sana Malik', 'Karachi', { deals_completed: 6, rating_avg: 4.5, rating_count: 5 }),
  person('u_bilal', 'Bilal Khan', 'Islamabad', { cnic_verified: true, deals_completed: 22, rating_avg: 4.9, rating_count: 20 }),
  person('u_usman', 'Usman Tariq', 'Rawalpindi', { deals_completed: 3, backouts: 1, rating_avg: 4.0, rating_count: 3 }),
  person('u_hina', 'Hina Shah', 'Faisalabad', { phone_verified: true, deals_completed: 1, rating_avg: 5, rating_count: 1 }),
  person('u_kamran', 'Kamran Ali', 'Multan', { deals_completed: 9, rating_avg: 4.6, rating_count: 8 }),
];

export const seedPhones: Record<string, string> = {
  u_ahmed: '+92 300 1234567', u_sana: '+92 321 7654321', u_bilal: '+92 333 5550101',
  u_usman: '+92 345 2223344', u_hina: '+92 301 9988776', u_kamran: '+92 312 4455667',
};

type L = [string, Category, Condition, number, string, string, string, string, number, boolean?];
const raw: L[] = [
  ['iPhone 13 128GB, PTA approved', 'mobiles', 'used', 145000, 'Lahore', 'DHA Phase 5', 'u_ahmed', 'Battery health 88%. Box and original cable. No scratches, always used with cover. PTA approved, both SIMs working.', 30, true],
  ['Samsung Galaxy S23 Ultra 256GB', 'mobiles', 'like_new', 235000, 'Karachi', 'Gulshan-e-Iqbal', 'u_sana', '3 months used, complete box, warranty till next year. Phantom black.', 8],
  ['Honda CD 70 2023 model', 'bikes', 'used', 158000, 'Rawalpindi', 'Saddar', 'u_usman', 'Lahore number, first owner, 9,000 km driven. Original documents, file complete.', 50],
  ['Toyota Corolla GLi 2017', 'vehicles', 'used', 4250000, 'Islamabad', 'G-11', 'u_bilal', 'Total genuine, 98,000 km. Islamabad registered. Token paid till 2026. Serious buyers only.', 20, true],
  ['Yamaha YBR 125G 2022', 'bikes', 'used', 385000, 'Multan', 'Gulgasht Colony', 'u_kamran', 'Well maintained, new tyres, documents clear.', 12],
  ['MacBook Air M2 8/256', 'electronics', 'like_new', 265000, 'Islamabad', 'F-7 Markaz', 'u_bilal', 'Midnight color, 40 battery cycles, with charger and box.', 6],
  ['Dawlance Inverter AC 1.5 Ton', 'electronics', 'used', 98000, 'Lahore', 'Johar Town', 'u_ahmed', 'One season used, cooling perfect, low electricity bill. Selling due to shifting.', 26],
  ['Sheesham wood 5-seater sofa set', 'home', 'used', 72000, 'Faisalabad', 'Peoples Colony', 'u_hina', 'Solid sheesham wood, cushions recently changed. Pickup from Faisalabad.', 40],
  ['Infinix Note 30 8/256', 'mobiles', 'used', 38000, 'Karachi', 'North Nazimabad', 'u_sana', 'Good condition, small mark on back. Charger included.', 3],
  ['3 Marla house for rent', 'property', 'used', 45000, 'Lahore', 'Wapda Town', 'u_ahmed', '2 beds, 2 baths, kitchen, gas and electricity separate meters. Family only. Monthly rent.', 70],
  ['PS5 Slim disc edition + 2 games', 'electronics', 'like_new', 152000, 'Rawalpindi', 'Bahria Town Phase 7', 'u_usman', 'Barely used, FC 25 and Spider-Man 2 included, 2 controllers.', 4],
  ['Gaming PC Ryzen 5 / RTX 3060', 'electronics', 'used', 175000, 'Multan', 'Cantt', 'u_kamran', '16GB RAM, 1TB NVMe, 650W PSU. Runs all games on high.', 15],
  ['Bridal lehenga, worn once', 'fashion', 'like_new', 85000, 'Karachi', 'Clifton', 'u_sana', 'Designer piece, maroon and gold. Medium size. Dupatta included.', 10],
  ['Suzuki Alto VXR 2021', 'vehicles', 'used', 2290000, 'Peshawar', 'Hayatabad', 'u_bilal', 'Peshawar registered, 41,000 km, minor touch-ups only. AC working.', 22],
];

export const seedListings: Listing[] = raw.map((r, i) => ({
  id: `l_${i + 1}`,
  title: r[0], category: r[1], condition: r[2], price: r[3], city: r[4], area: r[5],
  seller_id: r[6], description: r[7], photos: [], status: 'active',
  featured_until: r[9] ? iso(now + 5 * 24 * h) : null,
  views: 40 + ((i * 37) % 300), created_at: iso(now - r[8] * h),
}));

function offer(id: string, listing: string, buyer: string, pct: number, ageH: number, lifeH: number, status: Offer['status'] = 'pending'): Offer {
  const l = seedListings.find(x => x.id === listing)!;
  return {
    id, listing_id: listing, buyer_id: buyer, seller_id: l.seller_id,
    amount: Math.round((l.price * pct) / 500) * 500, message: '', counter_amount: null, status,
    created_at: iso(now - ageH * h), expires_at: iso(now - ageH * h + lifeH * h),
  };
}

export const seedOffers: Offer[] = [
  offer('o_1', 'l_1', 'u_sana', 0.9, 3, 24),
  offer('o_2', 'l_1', 'u_usman', 0.86, 6, 12),
  offer('o_3', 'l_1', 'u_kamran', 0.8, 20, 6, 'expired'),
  offer('o_4', 'l_3', 'u_ahmed', 0.93, 2, 6),
  offer('o_5', 'l_4', 'u_kamran', 0.92, 5, 48),
  offer('o_6', 'l_4', 'u_ahmed', 0.9, 10, 24, 'rejected'),
  offer('o_7', 'l_6', 'u_hina', 0.88, 1, 12),
  offer('o_8', 'l_7', 'u_bilal', 0.85, 4, 24),
  offer('o_9', 'l_11', 'u_bilal', 0.9, 2, 2),
  offer('o_10', 'l_12', 'u_usman', 0.82, 8, 24),
  offer('o_11', 'l_8', 'u_ahmed', 0.75, 12, 48),
];

export const seedReviews: Review[] = [
  { id: 'r_1', deal_id: 'd_old1', reviewer_id: 'u_sana', reviewee_id: 'u_ahmed', stars: 5, text: 'Item exactly as described. Smooth deal.', created_at: iso(now - 30 * 24 * h) },
  { id: 'r_2', deal_id: 'd_old2', reviewer_id: 'u_kamran', reviewee_id: 'u_bilal', stars: 5, text: 'Very honest seller, on time.', created_at: iso(now - 12 * 24 * h) },
  { id: 'r_3', deal_id: 'd_old3', reviewer_id: 'u_ahmed', reviewee_id: 'u_usman', stars: 3, text: 'Good bike, but he was late by an hour.', created_at: iso(now - 8 * 24 * h) },
];
