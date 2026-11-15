-- Live ticker + "closing soon" support.
drop function if exists public.listing_offer_summary(uuid[]);
create or replace function public.listing_offer_summary(p_ids uuid[])
returns table (listing_id uuid, offer_count int, top_offer bigint, next_expiry timestamptz)
language sql stable security definer set search_path = public as $$
  select listing_id, count(*)::int, max(amount), min(expires_at) from public.offers
  where listing_id = any(p_ids) and status in ('pending','countered') and expires_at > now()
  group by listing_id;
$$;

-- Latest offers across the marketplace. No buyer information is returned.
create or replace function public.live_offer_feed(p_limit int default 20)
returns table (id uuid, listing_id uuid, title text, category text, amount bigint, asking bigint, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.id, l.id, l.title, l.category, o.amount, l.price, o.created_at
  from public.offers o join public.listings l on l.id = o.listing_id
  where l.status in ('active','reserved')
  order by o.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;
