-- Run this once in Supabase: Project > SQL Editor > New query > paste all > Run

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  name text not null,
  phone text default '',
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  user_id uuid references auth.users not null default auth.uid(),
  visit_date date not null,
  appointment_time time not null default '09:00',
  services text[] not null default '{}',
  next_date date,
  notes text default '',
  created_at timestamptz default now()
);

alter table clients enable row level security;
alter table visits enable row level security;

create policy "Users manage their own clients"
  on clients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own visits"
  on visits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists visits_client_id_idx on visits (client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION (run this if you already have the visits table without appointment_time)
-- ─────────────────────────────────────────────────────────────────────────────
-- alter table visits
--   add column if not exists appointment_time time not null default '09:00';
