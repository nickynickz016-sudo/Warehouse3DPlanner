-- Run this code in the Supabase SQL Editor to set up your database

-- 1. Create the 'warehouses' table
-- This table stores the configuration JSON for each warehouse plan
create table public.warehouses (
  id text not null primary key,
  name text,
  data jsonb, -- Stores the entire WarehouseConfig object as JSON
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
-- This is required by Supabase for any table access via the JS Client
alter table public.warehouses enable row level security;

-- 3. Create a policy to allow public read/write access
-- Since we are using the 'anon' public API key in a client-side app without
-- Supabase Auth users, we enable public access. 
-- Note: The app handles "Admin" locking via the frontend interface.
create policy "Enable all access for public"
on public.warehouses
for all
using (true)
with check (true);
