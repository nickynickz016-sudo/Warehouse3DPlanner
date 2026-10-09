-- ==============================================================================
-- Writer Warehouse Planner Pro - Supabase Database Schema
-- Run this script in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Create the 'warehouses' table
-- Stores entire warehouse configurations and layouts as JSONB documents
create table if not exists public.warehouses (
  id text not null primary key,
  name text,
  data jsonb, -- Stores the full WarehouseConfig object
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS) on warehouses
alter table public.warehouses enable row level security;

-- 3. Create or replace public access policy for warehouses
-- Allows read, insert, update, and delete access via the anon key
drop policy if exists "Enable all access for public" on public.warehouses;
create policy "Enable all access for public"
on public.warehouses
for all
using (true)
with check (true);

-- 4. Create the 'passports' table
-- Stores immutable digital passport certificates & snapshots for units and jobs
create table if not exists public.passports (
  id uuid default gen_random_uuid() primary key,
  unit_id text not null,
  warehouse_name text,
  data jsonb not null, -- Snapshot of JobEntry or LayoutItem details
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Enable Row Level Security (RLS) on passports
alter table public.passports enable row level security;

-- 6. Create or replace public access policy for passports
drop policy if exists "Enable all access for public passports" on public.passports;
create policy "Enable all access for public passports"
on public.passports
for all
using (true)
with check (true);
