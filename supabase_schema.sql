-- ====================================================================
-- SUPABASE SCHEMA FOR SALES PERFORMANCE MANAGEMENT APP (CUSTOM AUTH)
-- Paste this script into your Supabase SQL Editor and run it.
-- ====================================================================

-- Drop existing tables to ensure we create the new schema with custom auth columns
drop table if exists public.sales cascade;
drop table if exists public.profiles cascade;

-- 1. Create Profiles Table (Self-contained for Custom Auth)
create table if not exists public.profiles (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  password text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'employee')),
  monthly_target numeric not null default 5000.00 check (monthly_target >= 0),
  is_verified boolean not null default false,
  verification_code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Disable RLS on Profiles for direct client-side custom auth management
alter table public.profiles disable row level security;

-- 2. Create Sales Table
create table if not exists public.sales (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.profiles(id) on delete cascade not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  total_amount numeric not null,
  sale_date date default current_date not null,
  customer_name text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Disable RLS on Sales for direct client-side operations
alter table public.sales disable row level security;

-- 3. Create Brands Table
create table if not exists public.brands (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Disable RLS on Brands for direct client-side operations
alter table public.brands disable row level security;

-- Force Supabase PostgREST API to reload the schema cache immediately
notify pgrst, 'reload schema';
