-- =============================================================
-- InkSnap – Full Supabase Schema
-- Deploy this in Supabase → SQL Editor → Run
-- =============================================================

-- ---------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for text search

-- ---------------------------------------------------------------
-- 1. PROFILES
-- Extends the built-in auth.users table (1-to-1).
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  name                  text,
  username              text unique,
  email                 text,
  bio                   text,
  location              text,
  latitude              double precision,
  longitude             double precision,
  is_artist             boolean not null default false,
  profile_photo_url     text,
  location_thumbnail_url text,
  studio_name           text,
  styles                text[]  default '{}',
  booking_status        boolean not null default true,
  booked_until          timestamptz,
  booking_link          text,
  general_availability  jsonb   default '{}',
  last_active           timestamptz default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, username, is_artist)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'username', ''),
    coalesce((new.raw_user_meta_data->>'is_artist')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------
-- 2. FOLLOWS
-- ---------------------------------------------------------------
create table if not exists public.follows (
  id           uuid primary key default uuid_generate_v4(),
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_follower_idx  on public.follows(follower_id);
create index if not exists follows_following_idx on public.follows(following_id);

-- ---------------------------------------------------------------
-- 3. PORTFOLIO IMAGES
-- ---------------------------------------------------------------
create table if not exists public.portfolio_images (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  image_url    text not null,
  public_id    text,            -- Cloudinary public_id for deletion
  caption      text,
  created_at   timestamptz not null default now()
);

create index if not exists portfolio_images_user_idx on public.portfolio_images(user_id);

-- ---------------------------------------------------------------
-- 4. IMAGE TAGS
-- ---------------------------------------------------------------
create table if not exists public.image_tags (
  id             uuid primary key default uuid_generate_v4(),
  image_id       uuid not null references public.portfolio_images(id) on delete cascade,
  tagger_user_id uuid not null references public.profiles(id) on delete cascade,
  tagged_user_id uuid references public.profiles(id) on delete set null,
  tag_text       text,
  x_position     double precision,
  y_position     double precision,
  created_at     timestamptz not null default now()
);

create index if not exists image_tags_image_idx on public.image_tags(image_id);

-- ---------------------------------------------------------------
-- 5. REVIEWS
-- ---------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default uuid_generate_v4(),
  artist_id   uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  stars       integer not null check (stars between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (artist_id, reviewer_id)   -- one review per client per artist
);

create index if not exists reviews_artist_idx   on public.reviews(artist_id);
create index if not exists reviews_reviewer_idx on public.reviews(reviewer_id);

-- ---------------------------------------------------------------
-- 6. BOOKINGS
-- ---------------------------------------------------------------
create table if not exists public.bookings (
  id                  uuid primary key default uuid_generate_v4(),
  artist_id           uuid not null references public.profiles(id) on delete cascade,
  client_id           uuid not null references public.profiles(id) on delete cascade,
  client_name         text,
  client_email        text,
  service_description text,
  requested_datetime  timestamptz,
  duration_minutes    integer,
  reference_image_url text,
  notes               text,
  status              text not null default 'pending'
                        check (status in ('pending', 'confirmed', 'declined', 'cancelled', 'completed')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
  before update on public.bookings
  for each row execute procedure public.set_updated_at();

create index if not exists bookings_artist_idx on public.bookings(artist_id);
create index if not exists bookings_client_idx on public.bookings(client_id);
create index if not exists bookings_status_idx on public.bookings(status);

-- ---------------------------------------------------------------
-- 7. CONVERSATIONS
-- user1_id is always the lesser UUID to enforce the unique pair constraint
-- ---------------------------------------------------------------
create table if not exists public.conversations (
  id         uuid primary key default uuid_generate_v4(),
  user1_id   uuid not null references public.profiles(id) on delete cascade,
  user2_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user1_id, user2_id),
  check (user1_id < user2_id)
);

create index if not exists conversations_user1_idx on public.conversations(user1_id);
create index if not exists conversations_user2_idx on public.conversations(user2_id);

-- ---------------------------------------------------------------
-- 8. MESSAGES
-- ---------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  receiver_id     uuid not null references public.profiles(id) on delete cascade,
  content         text,
  image_url       text,
  image_public_id text,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages(conversation_id);
create index if not exists messages_receiver_read_idx on public.messages(receiver_id, is_read);

-- ---------------------------------------------------------------
-- 9. POSTS
-- ---------------------------------------------------------------
create table if not exists public.posts (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text,
  content    text,
  image_url  text,
  public_id  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_posts_updated_at on public.posts;
create trigger set_posts_updated_at
  before update on public.posts
  for each row execute procedure public.set_updated_at();

create index if not exists posts_user_idx       on public.posts(user_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);

-- ---------------------------------------------------------------
-- 10. ARTIST DEALS
-- ---------------------------------------------------------------
create table if not exists public.artist_deals (
  id          uuid primary key default uuid_generate_v4(),
  artist_id   uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  image_url   text,
  public_id   text,
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists set_artist_deals_updated_at on public.artist_deals;
create trigger set_artist_deals_updated_at
  before update on public.artist_deals
  for each row execute procedure public.set_updated_at();

create index if not exists artist_deals_artist_idx on public.artist_deals(artist_id);

-- ---------------------------------------------------------------
-- 11. CONVENTION DATES
-- ---------------------------------------------------------------
create table if not exists public.convention_dates (
  id          uuid primary key default uuid_generate_v4(),
  artist_id   uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  location    text,
  start_date  date not null,
  end_date    date,
  booth_info  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists set_convention_dates_updated_at on public.convention_dates;
create trigger set_convention_dates_updated_at
  before update on public.convention_dates
  for each row execute procedure public.set_updated_at();

create index if not exists convention_dates_artist_idx on public.convention_dates(artist_id);
create index if not exists convention_dates_start_idx  on public.convention_dates(start_date);

-- ---------------------------------------------------------------
-- 12. RPC FUNCTIONS
-- ---------------------------------------------------------------

-- 12a. Get total unread messages for a user
create or replace function public.get_total_unread_messages(p_user_id uuid)
returns bigint language sql security definer as $$
  select count(*)
  from public.messages
  where receiver_id = p_user_id
    and is_read = false;
$$;

-- 12b. Start or get an existing conversation between two users
create or replace function public.start_or_get_conversation(p_user1_id uuid, p_user2_id uuid)
returns table(conversation_id uuid) language plpgsql security definer as $$
declare
  v_low  uuid;
  v_high uuid;
  v_id   uuid;
begin
  -- Enforce ordering so the unique constraint always holds
  if p_user1_id < p_user2_id then
    v_low  := p_user1_id;
    v_high := p_user2_id;
  else
    v_low  := p_user2_id;
    v_high := p_user1_id;
  end if;

  -- Try to find existing conversation
  select id into v_id
  from public.conversations
  where user1_id = v_low and user2_id = v_high;

  -- Create if not found
  if v_id is null then
    insert into public.conversations (user1_id, user2_id)
    values (v_low, v_high)
    on conflict (user1_id, user2_id) do nothing
    returning id into v_id;

    -- If insert hit the conflict, fetch it again
    if v_id is null then
      select id into v_id
      from public.conversations
      where user1_id = v_low and user2_id = v_high;
    end if;
  end if;

  return query select v_id;
end;
$$;

-- 12c. Get all conversations for a user with the other user's details
create or replace function public.get_conversations_with_details(p_user_id uuid)
returns table(
  conversation_id  uuid,
  other_user_id    uuid,
  other_username   text,
  other_name       text,
  other_photo_url  text,
  other_is_artist  boolean,
  last_message     text,
  last_message_at  timestamptz,
  unread_count     bigint
) language sql security definer as $$
  select
    c.id                           as conversation_id,
    case when c.user1_id = p_user_id then c.user2_id else c.user1_id end as other_user_id,
    p.username                     as other_username,
    p.name                         as other_name,
    p.profile_photo_url            as other_photo_url,
    p.is_artist                    as other_is_artist,
    lm.content                     as last_message,
    lm.created_at                  as last_message_at,
    coalesce(uc.unread_count, 0)   as unread_count
  from public.conversations c
  join public.profiles p
    on p.id = case when c.user1_id = p_user_id then c.user2_id else c.user1_id end
  left join lateral (
    select content, created_at
    from public.messages
    where conversation_id = c.id
    order by created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select count(*) as unread_count
    from public.messages
    where conversation_id = c.id
      and receiver_id = p_user_id
      and is_read = false
  ) uc on true
  where c.user1_id = p_user_id or c.user2_id = p_user_id
  order by lm.created_at desc nulls last;
$$;

-- 12d. Artist search (keyword + optional location)
create or replace function public.search_artists(
  keyword      text default null,
  search_lat   double precision default null,
  search_lon   double precision default null,
  location_text text default null
)
returns setof public.profiles language sql security definer as $$
  select *
  from public.profiles
  where is_artist = true
    and (
      keyword is null
      or keyword = ''
      or name     ilike '%' || keyword || '%'
      or username ilike '%' || keyword || '%'
      or bio      ilike '%' || keyword || '%'
      or location ilike '%' || keyword || '%'
      or exists (
           select 1 from unnest(styles) s where s ilike '%' || keyword || '%'
         )
    )
    and (
      location_text is null
      or location_text = ''
      or location ilike '%' || location_text || '%'
    )
  order by last_active desc nulls last;
$$;

-- 12e. Delete a user account and all associated data
create or replace function public.delete_user_account()
returns void language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  -- Cascade deletes handle most child rows via FK constraints.
  -- Delete from auth.users removes the profile via the cascade on profiles.id.
  delete from auth.users where id = v_user_id;
end;
$$;

-- ---------------------------------------------------------------
-- 13. ROW LEVEL SECURITY
-- ---------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.follows           enable row level security;
alter table public.portfolio_images  enable row level security;
alter table public.image_tags        enable row level security;
alter table public.reviews           enable row level security;
alter table public.bookings          enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.posts             enable row level security;
alter table public.artist_deals      enable row level security;
alter table public.convention_dates  enable row level security;

-- PROFILES
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
  using (id = auth.uid());

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles for delete
  using (id = auth.uid());

-- FOLLOWS
drop policy if exists "follows_select" on public.follows;
create policy "follows_select" on public.follows for select using (true);

drop policy if exists "follows_insert" on public.follows;
create policy "follows_insert" on public.follows for insert
  with check (follower_id = auth.uid());

drop policy if exists "follows_delete" on public.follows;
create policy "follows_delete" on public.follows for delete
  using (follower_id = auth.uid());

-- PORTFOLIO IMAGES
drop policy if exists "portfolio_select" on public.portfolio_images;
create policy "portfolio_select" on public.portfolio_images for select using (true);

drop policy if exists "portfolio_insert" on public.portfolio_images;
create policy "portfolio_insert" on public.portfolio_images for insert
  with check (user_id = auth.uid());

drop policy if exists "portfolio_update" on public.portfolio_images;
create policy "portfolio_update" on public.portfolio_images for update
  using (user_id = auth.uid());

drop policy if exists "portfolio_delete" on public.portfolio_images;
create policy "portfolio_delete" on public.portfolio_images for delete
  using (user_id = auth.uid());

-- IMAGE TAGS
drop policy if exists "image_tags_select" on public.image_tags;
create policy "image_tags_select" on public.image_tags for select using (true);

drop policy if exists "image_tags_insert" on public.image_tags;
create policy "image_tags_insert" on public.image_tags for insert
  with check (tagger_user_id = auth.uid());

drop policy if exists "image_tags_delete" on public.image_tags;
create policy "image_tags_delete" on public.image_tags for delete
  using (
    tagger_user_id = auth.uid()
    or exists (
      select 1 from public.portfolio_images pi
      where pi.id = image_id and pi.user_id = auth.uid()
    )
  );

-- REVIEWS
drop policy if exists "reviews_select" on public.reviews;
create policy "reviews_select" on public.reviews for select using (true);

drop policy if exists "reviews_insert" on public.reviews;
create policy "reviews_insert" on public.reviews for insert
  with check (reviewer_id = auth.uid());

drop policy if exists "reviews_update" on public.reviews;
create policy "reviews_update" on public.reviews for update
  using (reviewer_id = auth.uid());

drop policy if exists "reviews_delete" on public.reviews;
create policy "reviews_delete" on public.reviews for delete
  using (reviewer_id = auth.uid());

-- BOOKINGS
drop policy if exists "bookings_select" on public.bookings;
create policy "bookings_select" on public.bookings for select
  using (artist_id = auth.uid() or client_id = auth.uid());

drop policy if exists "bookings_insert" on public.bookings;
create policy "bookings_insert" on public.bookings for insert
  with check (client_id = auth.uid());

drop policy if exists "bookings_update" on public.bookings;
create policy "bookings_update" on public.bookings for update
  using (artist_id = auth.uid() or client_id = auth.uid());

drop policy if exists "bookings_delete" on public.bookings;
create policy "bookings_delete" on public.bookings for delete
  using (client_id = auth.uid());

-- CONVERSATIONS
drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select" on public.conversations for select
  using (user1_id = auth.uid() or user2_id = auth.uid());

drop policy if exists "conversations_insert" on public.conversations;
create policy "conversations_insert" on public.conversations for insert
  with check (user1_id = auth.uid() or user2_id = auth.uid());

-- MESSAGES
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert
  with check (sender_id = auth.uid());

drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages for update
  using (receiver_id = auth.uid()); -- only receiver can mark as read

-- POSTS
drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts for select using (true);

drop policy if exists "posts_insert" on public.posts;
create policy "posts_insert" on public.posts for insert
  with check (user_id = auth.uid());

drop policy if exists "posts_update" on public.posts;
create policy "posts_update" on public.posts for update
  using (user_id = auth.uid());

drop policy if exists "posts_delete" on public.posts;
create policy "posts_delete" on public.posts for delete
  using (user_id = auth.uid());

-- ARTIST DEALS
drop policy if exists "artist_deals_select" on public.artist_deals;
create policy "artist_deals_select" on public.artist_deals for select using (true);

drop policy if exists "artist_deals_insert" on public.artist_deals;
create policy "artist_deals_insert" on public.artist_deals for insert
  with check (artist_id = auth.uid());

drop policy if exists "artist_deals_update" on public.artist_deals;
create policy "artist_deals_update" on public.artist_deals for update
  using (artist_id = auth.uid());

drop policy if exists "artist_deals_delete" on public.artist_deals;
create policy "artist_deals_delete" on public.artist_deals for delete
  using (artist_id = auth.uid());

-- CONVENTION DATES
drop policy if exists "convention_dates_select" on public.convention_dates;
create policy "convention_dates_select" on public.convention_dates for select using (true);

drop policy if exists "convention_dates_insert" on public.convention_dates;
create policy "convention_dates_insert" on public.convention_dates for insert
  with check (artist_id = auth.uid());

drop policy if exists "convention_dates_update" on public.convention_dates;
create policy "convention_dates_update" on public.convention_dates for update
  using (artist_id = auth.uid());

drop policy if exists "convention_dates_delete" on public.convention_dates;
create policy "convention_dates_delete" on public.convention_dates for delete
  using (artist_id = auth.uid());

-- ---------------------------------------------------------------
-- 14. Realtime
-- Enable realtime on messages and conversations so the chat works.
-- ---------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;

-- ---------------------------------------------------------------
-- Done!
-- ---------------------------------------------------------------
