-- Sauda marketplace: initial schema
-- Trust rules live here, in the database, so no app (or hacked app) can break them:
--  * phone numbers are private and only returned by reveal_phone() to the two people in an agreed deal
--  * every reveal is logged and visible to both sides
--  * offers expire on their own; only the seller can accept/reject/counter
--  * ratings only after a completed deal, one per person per deal
--  * backing out of an agreed deal adds to a public back-out count

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '' check (char_length(name) <= 60),
  city text not null default '',
  avatar_url text,
  phone_verified boolean not null default false,
  cnic_verified boolean not null default false,   -- set by admins only
  deals_completed int not null default 0,
  backouts int not null default 0,
  rating_avg numeric(2,1),
  rating_count int not null default 0,
  show_last_seen boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

-- phone lives in its own table that nobody can read directly (not even the owner via the API)
create table public.private_contacts (
  user_id uuid primary key references public.profiles on delete cascade,
  phone text not null
);

-- create a profile automatically after phone OTP sign-up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone_verified) values (new.id, new.phone is not null)
  on conflict (id) do nothing;
  if new.phone is not null then
    insert into public.private_contacts (user_id, phone) values (new.id, '+' || ltrim(new.phone, '+'))
    on conflict (user_id) do update set phone = excluded.phone;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- users may edit only these columns of their own profile
create or replace function public.guard_profile_update() returns trigger
language plpgsql as $$
begin
  if current_user = 'authenticated' then
    new.phone_verified := old.phone_verified;
    new.cnic_verified := old.cnic_verified;
    new.deals_completed := old.deals_completed;
    new.backouts := old.backouts;
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------- listings ----------
create type public.listing_status as enum ('active', 'reserved', 'sold', 'paused');
create type public.item_condition as enum ('new', 'like_new', 'used', 'for_parts');

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 5 and 90),
  description text not null default '' check (char_length(description) <= 4000),
  category text not null,
  condition public.item_condition not null default 'used',
  price bigint not null check (price > 0),
  city text not null,
  area text not null default '',
  photos text[] not null default '{}',
  status public.listing_status not null default 'active',
  featured_until timestamptz,          -- paid boost, set by admins/payments only
  views int not null default 0,
  created_at timestamptz not null default now()
);
create index listings_browse on public.listings (status, category, city, created_at desc);
create index listings_seller on public.listings (seller_id);
create index listings_search on public.listings using gin (to_tsvector('simple', title || ' ' || description));

create or replace function public.guard_listing_update() returns trigger
language plpgsql as $$
begin
  if current_user = 'authenticated' then
    new.seller_id := old.seller_id;
    new.featured_until := old.featured_until;
    new.views := old.views;
    new.created_at := old.created_at;
    -- reserved/sold are set by the deal flow, sellers can only pause/resume
    if new.status is distinct from old.status
       and not (old.status in ('active','paused') and new.status in ('active','paused'))
       and not (old.status in ('active','paused','reserved') and new.status = 'sold' and not exists (
         select 1 from public.deals d where d.listing_id = old.id and d.status = 'agreed')) then
      raise exception 'You cannot change the ad to % right now', new.status;
    end if;
  end if;
  return new;
end $$;
create trigger listings_guard before update on public.listings
  for each row execute function public.guard_listing_update();

-- ---------- offers ----------
create type public.offer_status as enum ('pending', 'countered', 'accepted', 'rejected', 'withdrawn', 'expired');

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings on delete cascade,
  buyer_id uuid not null references public.profiles on delete cascade,
  seller_id uuid not null references public.profiles on delete cascade,
  amount bigint not null check (amount > 0),
  message text not null default '' check (char_length(message) <= 300),
  counter_amount bigint,
  status public.offer_status not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index offers_listing on public.offers (listing_id);
create index offers_buyer on public.offers (buyer_id);
create index offers_seller on public.offers (seller_id);
create unique index offers_one_open_per_buyer on public.offers (listing_id, buyer_id)
  where status in ('pending', 'countered');

create or replace function public.expire_offers() returns void
language sql security definer set search_path = public as $$
  update public.offers set status = 'expired'
  where status in ('pending','countered') and expires_at <= now();
$$;

-- ---------- deals ----------
create type public.deal_status as enum ('agreed', 'completed', 'cancelled');

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings on delete cascade,
  offer_id uuid not null references public.offers on delete cascade,
  seller_id uuid not null references public.profiles,
  buyer_id uuid not null references public.profiles,
  price bigint not null,
  status public.deal_status not null default 'agreed',
  seller_confirmed boolean not null default false,
  buyer_confirmed boolean not null default false,
  cancelled_by uuid references public.profiles,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index deals_one_active_per_listing on public.deals (listing_id) where status = 'agreed';

create table public.phone_reveals (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals on delete cascade,
  viewer_id uuid not null references public.profiles,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals on delete cascade,
  reviewer_id uuid not null references public.profiles,
  reviewee_id uuid not null references public.profiles,
  stars int not null check (stars between 1 and 5),
  text text not null default '' check (char_length(text) <= 500),
  created_at timestamptz not null default now(),
  unique (deal_id, reviewer_id)
);

-- ---------- chat ----------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings on delete cascade,
  buyer_id uuid not null references public.profiles,
  seller_id uuid not null references public.profiles,
  last_message text,
  last_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id uuid not null references public.profiles default auth.uid(),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_convo on public.messages (conversation_id, created_at);

create or replace function public.touch_conversation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message = left(new.body, 140), last_at = new.created_at
  where id = new.conversation_id;
  return new;
end $$;
create trigger messages_touch after insert on public.messages
  for each row execute function public.touch_conversation();

-- ---------- saved & reports ----------
create table public.saved_listings (
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  listing_id uuid not null references public.listings on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings on delete cascade,
  reporter_id uuid not null references public.profiles default auth.uid(),
  reason text not null check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.private_contacts enable row level security;
alter table public.listings enable row level security;
alter table public.offers enable row level security;
alter table public.deals enable row level security;
alter table public.phone_reveals enable row level security;
alter table public.reviews enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.saved_listings enable row level security;
alter table public.reports enable row level security;

create policy "profiles are public" on public.profiles for select using (true);
create policy "edit own profile" on public.profiles for update using (id = auth.uid());
-- private_contacts: no policies at all = no direct access

create policy "listings are public" on public.listings for select using (true);
create policy "post own listing" on public.listings for insert with check (seller_id = auth.uid());
create policy "edit own listing" on public.listings for update using (seller_id = auth.uid());
create policy "delete own listing" on public.listings for delete using (seller_id = auth.uid());

-- full offer rows only for the two people involved; everyone else uses public_offer_board()
create policy "see own offers" on public.offers for select using (auth.uid() in (buyer_id, seller_id));

create policy "see own deals" on public.deals for select using (auth.uid() in (buyer_id, seller_id));
create policy "see reveal log of own deals" on public.phone_reveals for select using (
  exists (select 1 from public.deals d where d.id = deal_id and auth.uid() in (d.buyer_id, d.seller_id)));
create policy "reviews are public" on public.reviews for select using (true);

create policy "see own chats" on public.conversations for select using (auth.uid() in (buyer_id, seller_id));
create policy "see own messages" on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id)));
create policy "send in own chats" on public.messages for insert with check (
  sender_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id)));

create policy "own saved" on public.saved_listings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "file reports" on public.reports for insert with check (reporter_id = auth.uid());

-- ---------- functions the app calls ----------

-- public offer board: amounts and status are open to all, buyer identity is masked
create or replace function public.public_offer_board(p_listing uuid)
returns table (id uuid, listing_id uuid, amount bigint, counter_amount bigint, status public.offer_status,
  expires_at timestamptz, created_at timestamptz, buyer_label text, buyer_verified boolean, buyer_deals int, is_mine boolean)
language sql stable security definer set search_path = public as $$
  with b as (
    select buyer_id, 'Buyer ' || row_number() over (order by min(created_at)) as label
    from public.offers where listing_id = p_listing group by buyer_id
  )
  select o.id, o.listing_id, o.amount, o.counter_amount,
    case when o.status in ('pending','countered') and o.expires_at <= now() then 'expired'::public.offer_status else o.status end,
    o.expires_at, o.created_at, b.label, p.cnic_verified, p.deals_completed, o.buyer_id = auth.uid()
  from public.offers o join b on b.buyer_id = o.buyer_id join public.profiles p on p.id = o.buyer_id
  where o.listing_id = p_listing
  order by o.amount desc;
$$;

create or replace function public.listing_offer_summary(p_ids uuid[])
returns table (listing_id uuid, offer_count int, top_offer bigint)
language sql stable security definer set search_path = public as $$
  select listing_id, count(*)::int, max(amount) from public.offers
  where listing_id = any(p_ids) and status in ('pending','countered') and expires_at > now()
  group by listing_id;
$$;

create or replace function public.make_offer(p_listing uuid, p_amount bigint, p_hours int, p_message text default '')
returns public.offers
language plpgsql security definer set search_path = public as $$
declare l public.listings; o public.offers;
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  perform public.expire_offers();
  select * into l from public.listings where id = p_listing;
  if not found then raise exception 'Ad not found'; end if;
  if l.seller_id = auth.uid() then raise exception 'You cannot make an offer on your own ad'; end if;
  if l.status <> 'active' then raise exception 'This ad is not taking offers right now'; end if;
  if p_hours not in (2, 6, 12, 24, 48) then raise exception 'Invalid offer duration'; end if;
  if p_amount < ceil(l.price * 0.4) then raise exception 'Offer must be at least 40%% of the asking price'; end if;
  if p_amount > l.price * 1.5 then raise exception 'Offer is far above the asking price'; end if;
  if (select count(*) from public.offers where buyer_id = auth.uid() and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many offers, please wait a bit';
  end if;
  insert into public.offers (listing_id, buyer_id, seller_id, amount, message, expires_at)
  values (p_listing, auth.uid(), l.seller_id, p_amount, coalesce(p_message, ''), now() + make_interval(hours => p_hours))
  returning * into o;
  return o;
exception when unique_violation then
  raise exception 'You already have an open offer here. Withdraw it first to send a new one.';
end $$;

create or replace function public.withdraw_offer(p_offer uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.offers set status = 'withdrawn'
  where id = p_offer and buyer_id = auth.uid() and status in ('pending','countered') and expires_at > now();
  if not found then raise exception 'This offer is already closed'; end if;
end $$;

create or replace function public.respond_offer(p_offer uuid, p_action text, p_counter bigint default null)
returns public.deals
language plpgsql security definer set search_path = public as $$
declare o public.offers; l public.listings; d public.deals; v_price bigint;
begin
  perform public.expire_offers();
  select * into o from public.offers where id = p_offer for update;
  if not found then raise exception 'Offer not found'; end if;
  if o.status not in ('pending','countered') then raise exception 'This offer has expired or is already closed'; end if;
  select * into l from public.listings where id = o.listing_id for update;
  if l.status <> 'active' then raise exception 'This ad already has a deal in progress'; end if;

  if p_action = 'accept_counter' then
    if o.buyer_id <> auth.uid() or o.status <> 'countered' then raise exception 'Nothing to accept'; end if;
    v_price := o.counter_amount;
  elsif o.seller_id <> auth.uid() then
    raise exception 'Only the seller can respond';
  elsif p_action = 'reject' then
    update public.offers set status = 'rejected' where id = o.id; return null;
  elsif p_action = 'counter' then
    if p_counter is null or p_counter <= o.amount then raise exception 'Counter must be higher than the offer'; end if;
    update public.offers set status = 'countered', counter_amount = p_counter where id = o.id; return null;
  elsif p_action = 'accept' then
    v_price := case when o.status = 'countered' then o.counter_amount else o.amount end;
  else
    raise exception 'Unknown action';
  end if;

  update public.offers set status = 'accepted' where id = o.id;
  update public.listings set status = 'reserved' where id = l.id;
  insert into public.deals (listing_id, offer_id, seller_id, buyer_id, price)
  values (l.id, o.id, o.seller_id, o.buyer_id, v_price) returning * into d;
  return d;
end $$;

create or replace function public.reveal_phone(p_deal uuid) returns text
language plpgsql security definer set search_path = public as $$
declare d public.deals; v_phone text;
begin
  select * into d from public.deals where id = p_deal;
  if not found or auth.uid() not in (d.buyer_id, d.seller_id) then raise exception 'Not your deal'; end if;
  if d.status = 'cancelled' then raise exception 'This deal was cancelled, numbers are hidden again'; end if;
  select phone into v_phone from public.private_contacts
  where user_id = case when d.buyer_id = auth.uid() then d.seller_id else d.buyer_id end;
  insert into public.phone_reveals (deal_id, viewer_id) values (d.id, auth.uid());
  return coalesce(v_phone, 'Not available');
end $$;

create or replace function public.confirm_deal(p_deal uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d public.deals;
begin
  select * into d from public.deals where id = p_deal for update;
  if not found or d.status <> 'agreed' or auth.uid() not in (d.buyer_id, d.seller_id) then
    raise exception 'Deal cannot be confirmed';
  end if;
  update public.deals set
    buyer_confirmed = buyer_confirmed or (buyer_id = auth.uid()),
    seller_confirmed = seller_confirmed or (seller_id = auth.uid())
  where id = p_deal returning * into d;
  if d.buyer_confirmed and d.seller_confirmed then
    update public.deals set status = 'completed', completed_at = now() where id = p_deal;
    update public.listings set status = 'sold' where id = d.listing_id;
    update public.profiles set deals_completed = deals_completed + 1 where id in (d.buyer_id, d.seller_id);
  end if;
end $$;

create or replace function public.cancel_deal(p_deal uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d public.deals;
begin
  select * into d from public.deals where id = p_deal for update;
  if not found or d.status <> 'agreed' or auth.uid() not in (d.buyer_id, d.seller_id) then
    raise exception 'Deal cannot be cancelled';
  end if;
  update public.deals set status = 'cancelled', cancelled_by = auth.uid() where id = p_deal;
  update public.profiles set backouts = backouts + 1 where id = auth.uid();
  update public.listings set status = 'active' where id = d.listing_id and status = 'reserved';
end $$;

create or replace function public.leave_review(p_deal uuid, p_stars int, p_text text default '') returns void
language plpgsql security definer set search_path = public as $$
declare d public.deals; v_reviewee uuid;
begin
  select * into d from public.deals where id = p_deal;
  if not found or auth.uid() not in (d.buyer_id, d.seller_id) then raise exception 'Not your deal'; end if;
  if d.status <> 'completed' then raise exception 'You can rate only after the deal is completed'; end if;
  v_reviewee := case when d.buyer_id = auth.uid() then d.seller_id else d.buyer_id end;
  insert into public.reviews (deal_id, reviewer_id, reviewee_id, stars, text)
  values (p_deal, auth.uid(), v_reviewee, p_stars, coalesce(p_text, ''));
  update public.profiles p set
    rating_count = s.c, rating_avg = s.a
  from (select count(*)::int c, round(avg(stars)::numeric, 1) a from public.reviews where reviewee_id = v_reviewee) s
  where p.id = v_reviewee;
exception when unique_violation then
  raise exception 'You already rated this deal';
end $$;

create or replace function public.open_conversation(p_listing uuid) returns public.conversations
language plpgsql security definer set search_path = public as $$
declare l public.listings; c public.conversations;
begin
  select * into l from public.listings where id = p_listing;
  if not found then raise exception 'Ad not found'; end if;
  if l.seller_id = auth.uid() then raise exception 'This is your own ad'; end if;
  insert into public.conversations (listing_id, buyer_id, seller_id) values (p_listing, auth.uid(), l.seller_id)
  on conflict (listing_id, buyer_id) do update set listing_id = excluded.listing_id
  returning * into c;
  return c;
end $$;

create or replace function public.record_view(p_listing uuid) returns void
language sql security definer set search_path = public as $$
  update public.listings set views = views + 1 where id = p_listing and seller_id is distinct from auth.uid();
$$;

-- lock down: only signed-in users may call the write functions
revoke execute on function public.make_offer, public.withdraw_offer, public.respond_offer, public.reveal_phone,
  public.confirm_deal, public.cancel_deal, public.leave_review, public.open_conversation from anon, public;
grant execute on function public.make_offer, public.withdraw_offer, public.respond_offer, public.reveal_phone,
  public.confirm_deal, public.cancel_deal, public.leave_review, public.open_conversation to authenticated;
revoke execute on function public.expire_offers from anon, authenticated, public;

-- realtime for chat + offers
alter publication supabase_realtime add table public.messages, public.offers;

-- photo storage: public bucket, users write only inside their own folder
insert into storage.buckets (id, name, public) values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;
create policy "upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
