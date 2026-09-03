-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Campaigns table
create table public.campaigns (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  guest_session_id text, -- for guest players
  country_id text not null default 'brazil',
  country_name text not null default 'Brazil',
  player_name text not null default 'Marina Duarte',
  player_title text not null default 'President',
  turn integer not null default 1,
  game_date text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'failed', 'abandoned')),
  outcome text, -- how the campaign ended if not active
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Enforce max 3 campaigns per authenticated user
  constraint max_campaigns_per_user check (true) -- enforced via RLS policy
);

-- Game saves table (stores full GameState per campaign)
create table public.game_saves (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  turn integer not null,
  game_state jsonb not null, -- full GameState object serialised as JSON
  saved_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- One save per turn per campaign (upsert replaces)
  unique(campaign_id, turn)
);

-- Turn history table (individual turn records for analytics)
create table public.turn_history (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  turn integer not null,
  orders_issued text,
  narrative_summary text,
  approval_change integer,
  security_change integer,
  key_events text[],
  recorded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.game_saves enable row level security;
alter table public.turn_history enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Campaigns policies
create policy "Users can view own campaigns"
  on public.campaigns for select
  using (auth.uid() = user_id);

create policy "Users can create campaigns"
  on public.campaigns for insert
  with check (auth.uid() = user_id);

create policy "Users can update own campaigns"
  on public.campaigns for update
  using (auth.uid() = user_id);

create policy "Users can delete own campaigns"
  on public.campaigns for delete
  using (auth.uid() = user_id);

-- Game saves policies
create policy "Users can view own saves"
  on public.game_saves for select
  using (
    exists (
      select 1 from public.campaigns
      where campaigns.id = game_saves.campaign_id
      and campaigns.user_id = auth.uid()
    )
  );

create policy "Users can create saves"
  on public.game_saves for insert
  with check (
    exists (
      select 1 from public.campaigns
      where campaigns.id = game_saves.campaign_id
      and campaigns.user_id = auth.uid()
    )
  );

create policy "Users can update own saves"
  on public.game_saves for update
  using (
    exists (
      select 1 from public.campaigns
      where campaigns.id = game_saves.campaign_id
      and campaigns.user_id = auth.uid()
    )
  );

-- Turn history policies
create policy "Users can view own turn history"
  on public.turn_history for select
  using (
    exists (
      select 1 from public.campaigns
      where campaigns.id = turn_history.campaign_id
      and campaigns.user_id = auth.uid()
    )
  );

create policy "Users can insert turn history"
  on public.turn_history for insert
  with check (
    exists (
      select 1 from public.campaigns
      where campaigns.id = turn_history.campaign_id
      and campaigns.user_id = auth.uid()
    )
  );

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call above function on new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to enforce max 3 campaigns per user
create or replace function public.check_campaign_limit()
returns trigger as $$
begin
  if (
    select count(*)
    from public.campaigns
    where user_id = new.user_id
    and status = 'active'
  ) >= 3 then
    raise exception 'Maximum of 3 active campaigns allowed';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger enforce_campaign_limit
  before insert on public.campaigns
  for each row execute procedure public.check_campaign_limit();

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger campaigns_updated_at
  before update on public.campaigns
  for each row execute procedure public.handle_updated_at();
