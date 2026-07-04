-- ====================================================================
-- SEED DATA FOR SALES PERFORMANCE MANAGEMENT APP
-- Paste this script into your Supabase SQL Editor and run it.
-- This script inserts mock admins, employees, and sales logs.
-- ====================================================================

-- 1. Insert Mock Profiles (Admins & Employees)
insert into public.profiles (id, email, password, full_name, role, monthly_target, is_verified)
values
  -- Pre-configured Demo Admin
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@demo.com', 'admin123', 'Admin Owner', 'admin', 0, true),
  
  -- Pre-configured Employees with Targets
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'john@company.com', 'john123', 'John Doe', 'employee', 15000.00, true),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'jane@company.com', 'jane123', 'Jane Smith', 'employee', 20000.00, true),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'bob@company.com', 'bob123', 'Bob Johnson', 'employee', 12000.00, true)
on conflict (email) do update
set 
  password = excluded.password,
  full_name = excluded.full_name,
  role = excluded.role,
  monthly_target = excluded.monthly_target,
  is_verified = excluded.is_verified;

-- 2. Clean out old sales logs to avoid duplicate primary key errors during seeding resets
truncate table public.sales cascade;

-- 3. Insert Sales Logs for the Last 7 Days (Relative to current_date)
insert into public.sales (employee_id, product_name, quantity, unit_price, total_amount, sale_date, customer_name, notes, status, approved_by)
values
  -- --- JOHN DOE SALES ---
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 
    'SaaS Enterprise Package', 
    1, 
    5000.00, 
    5000.00, 
    current_date - 6, 
    'Acme Corporation', 
    'Standard yearly license package.', 
    'approved', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 
    'Cloud Backup Storage', 
    10, 
    150.00, 
    1500.00, 
    current_date - 4, 
    'Delta Tech Systems', 
    '10x 1TB premium backup storage packages.', 
    'approved', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 
    'Standard Support Retainer', 
    1, 
    1200.00, 
    1200.00, 
    current_date - 1, 
    'Global Logistics Corp', 
    'Monthly critical support retainer.', 
    'approved', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 
    'On-site Consulting Pack', 
    2, 
    1500.00, 
    3000.00, 
    current_date, 
    'Initech Inc', 
    '2-day workflow optimization consulting.', 
    'pending', 
    null
  ),

  -- --- JANE SMITH SALES (Top Performer) ---
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 
    'API Developer Licensing', 
    3, 
    2500.00, 
    7500.00, 
    current_date - 5, 
    'BetaTech Solutions', 
    'Closed developer API licensing terms.', 
    'approved', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 
    'Full Security Audit', 
    1, 
    4500.00, 
    4500.00, 
    current_date - 3, 
    'CyberShield Financials', 
    'Annual security penetration and threat audit.', 
    'approved', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 
    'Custom Database Optimization', 
    1, 
    8000.00, 
    8000.00, 
    current_date - 2, 
    'Dunder Mifflin Paper Co', 
    'Postgres performance optimization and clustering package.', 
    'approved', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 
    'Hardware Server Rack Bundle', 
    5, 
    900.00, 
    4500.00, 
    current_date, 
    'Stark Industries Corp', 
    'Delivery of 5 physical database node rack systems.', 
    'pending', 
    null
  ),

  -- --- BOB JOHNSON SALES ---
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 
    'User Seat License Extension', 
    20, 
    100.00, 
    2000.00, 
    current_date - 6, 
    'Apex Investment Group', 
    '20 additional seat extensions for sales CRM.', 
    'approved', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 
    'Systems Setup & Onboarding', 
    1, 
    1500.00, 
    1500.00, 
    current_date - 4, 
    'Omni Consumer Products', 
    'Initial cloud setup service bundle.', 
    'approved', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 
    'Data Analytics Suite', 
    1, 
    3000.00, 
    3000.00, 
    current_date - 2, 
    'Wayne Enterprises', 
    'Analytics suite software dashboard licenses.', 
    'approved', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 
    'Network Optimization Consultancy', 
    1, 
    2400.00, 
    2400.00, 
    current_date - 1, 
    'Tyrell Corporate', 
    'Audit was completed but results rejected by client.', 
    'rejected', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  );

-- 5. Insert Mock Brands
insert into public.brands (name)
values
  ('AuraCloud SaaS'),
  ('Backup Storage Premium'),
  ('Security Audit Retainer')
on conflict (name) do nothing;

-- 4. Reload PostgREST cache to guarantee database reads reflect references immediately
notify pgrst, 'reload schema';
