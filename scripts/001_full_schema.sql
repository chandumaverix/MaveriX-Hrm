-- =============================================================================
-- HRM Full Schema – run once on a new Supabase project.
-- No ALTERs needed: all columns are in CREATE TABLE for easy migration.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Employees (extends auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.employees (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  first_name text not null,
  last_name text not null,
  phone text,
  designation text,
  department text,
  role text not null default 'employee',
  avatar_url text,
  date_of_birth date,
  joining_date date default current_date,
  employee_id text unique,
  is_active boolean default true,
  -- Address & documents
  address text,
  week_off_day smallint,
  adhar_url text,
  pan_url text,
  bank_name text,
  bank_account_number text,
  bank_ifsc text,
  bank_location text,
  pan_number text,
  aadhar_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on column public.employees.week_off_day is '0=Sunday, 1=Monday, ..., 6=Saturday';
comment on column public.employees.address is 'Residential/postal address';

-- -----------------------------------------------------------------------------
-- 2. Teams
-- -----------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  leader_id uuid references public.employees(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 3. Team members
-- -----------------------------------------------------------------------------
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(team_id, employee_id)
);

-- -----------------------------------------------------------------------------
-- 4. Attendance
-- -----------------------------------------------------------------------------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  date date not null default current_date,
  clock_in timestamptz,
  clock_out timestamptz,
  total_hours numeric(5,2),
  status text not null default 'present',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(employee_id, date)
);

-- -----------------------------------------------------------------------------
-- 5. Leave types
-- -----------------------------------------------------------------------------
create table if not exists public.leave_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  default_days integer not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 6. Leave balances (numeric for half-day 0.5)
-- -----------------------------------------------------------------------------
create table if not exists public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete cascade,
  total_days numeric(5,2) not null default 0,
  used_days numeric(5,2) not null default 0,
  year integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(employee_id, leave_type_id, year)
);

-- -----------------------------------------------------------------------------
-- 7. Leave requests (with half-day and document)
-- -----------------------------------------------------------------------------
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  half_day boolean default false,
  half_day_period text check (half_day_period in ('first_half', 'second_half')),
  document_url text,
  status text not null default 'pending',
  reviewed_by uuid references public.employees(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 8. Finance records
-- -----------------------------------------------------------------------------
create table if not exists public.finance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  amount numeric(12,2) not null,
  type text not null default 'salary',
  description text,
  month integer,
  year integer,
  status text not null default 'pending',
  paid_at timestamptz,
  created_by uuid references public.employees(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 9. Resignations
-- -----------------------------------------------------------------------------
create table if not exists public.resignations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  reason text not null,
  last_working_day date not null,
  status text not null default 'pending',
  notes text,
  reviewed_by uuid references public.employees(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 10. Feed posts
-- -----------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.employees(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 11. Announcements
-- -----------------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text,
  content text not null,
  date date not null,
  created_by uuid references public.employees(id) on delete set null,
  created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 12. Settings (single row for system-wide config)
-- -----------------------------------------------------------------------------
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  max_clocking_time text not null default '11:00 AM',
  max_late_days integer not null default 3,
  auto_clock_out_time text not null default '7:30 PM',
  late_policy_leave_type_id uuid references public.leave_types(id) on delete set null,
  late_policy_deduction_per_day numeric(3,2) not null default 0.5,
  company_name text default 'Company Name',
  company_logo_url text default '/paysliplogo.png',
  company_address text[] default array['Address Line 1', 'Address Line 2', 'City, State, Country'],
  updated_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 13. Late deductions log (tracks monthly deductions per employee)
-- -----------------------------------------------------------------------------
create table if not exists public.late_deductions_log (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  year integer not null,
  month integer not null,
  last_deducted_late_count integer not null default 0,
  total_deducted numeric(5,2) not null default 0,
  leave_type_id uuid references public.leave_types(id) on delete set null,
  updated_at timestamptz default now(),
  unique(employee_id, year, month)
);

-- -----------------------------------------------------------------------------
-- RLS: enable on all tables
-- -----------------------------------------------------------------------------
alter table public.employees enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.attendance enable row level security;
alter table public.leave_types enable row level security;
alter table public.leave_balances enable row level security;
alter table public.leave_requests enable row level security;
alter table public.finance_records enable row level security;
alter table public.resignations enable row level security;
alter table public.posts enable row level security;
alter table public.announcements enable row level security;
alter table public.settings enable row level security;
alter table public.late_deductions_log enable row level security;

-- -----------------------------------------------------------------------------
-- RLS policies (authenticated users; restrict in app by role if needed)
-- -----------------------------------------------------------------------------
create policy "employees_select" on public.employees for select to authenticated using (true);
create policy "employees_insert" on public.employees for insert to authenticated with check (true);
create policy "employees_update" on public.employees for update to authenticated using (true);
create policy "employees_delete" on public.employees for delete to authenticated using (true);

create policy "teams_select" on public.teams for select to authenticated using (true);
create policy "teams_insert" on public.teams for insert to authenticated with check (true);
create policy "teams_update" on public.teams for update to authenticated using (true);
create policy "teams_delete" on public.teams for delete to authenticated using (true);

create policy "team_members_select" on public.team_members for select to authenticated using (true);
create policy "team_members_insert" on public.team_members for insert to authenticated with check (true);
create policy "team_members_update" on public.team_members for update to authenticated using (true);
create policy "team_members_delete" on public.team_members for delete to authenticated using (true);

create policy "attendance_select" on public.attendance for select to authenticated using (true);
create policy "attendance_insert" on public.attendance for insert to authenticated with check (true);
create policy "attendance_update" on public.attendance for update to authenticated using (true);
create policy "attendance_delete" on public.attendance for delete to authenticated using (true);

create policy "leave_types_select" on public.leave_types for select to authenticated using (true);
create policy "leave_types_insert" on public.leave_types for insert to authenticated with check (true);
create policy "leave_types_update" on public.leave_types for update to authenticated using (true);
create policy "leave_types_delete" on public.leave_types for delete to authenticated using (true);

create policy "leave_balances_select" on public.leave_balances for select to authenticated using (true);
create policy "leave_balances_insert" on public.leave_balances for insert to authenticated with check (true);
create policy "leave_balances_update" on public.leave_balances for update to authenticated using (true);
create policy "leave_balances_delete" on public.leave_balances for delete to authenticated using (true);

create policy "leave_requests_select" on public.leave_requests for select to authenticated using (true);
create policy "leave_requests_insert" on public.leave_requests for insert to authenticated with check (true);
create policy "leave_requests_update" on public.leave_requests for update to authenticated using (true);
create policy "leave_requests_delete" on public.leave_requests for delete to authenticated using (true);

create policy "finance_records_select" on public.finance_records for select to authenticated using (true);
create policy "finance_records_insert" on public.finance_records for insert to authenticated with check (true);
create policy "finance_records_update" on public.finance_records for update to authenticated using (true);
create policy "finance_records_delete" on public.finance_records for delete to authenticated using (true);

create policy "resignations_select" on public.resignations for select to authenticated using (true);
create policy "resignations_insert" on public.resignations for insert to authenticated with check (true);
create policy "resignations_update" on public.resignations for update to authenticated using (true);
create policy "resignations_delete" on public.resignations for delete to authenticated using (true);

create policy "posts_select" on public.posts for select to authenticated using (true);
create policy "posts_insert" on public.posts for insert to authenticated with check (true);
create policy "posts_update" on public.posts for update to authenticated using (true);
create policy "posts_delete" on public.posts for delete to authenticated using (true);

create policy "announcements_select" on public.announcements for select to authenticated using (true);
create policy "announcements_insert" on public.announcements for insert to authenticated with check (true);
create policy "announcements_update" on public.announcements for update to authenticated using (true);
create policy "announcements_delete" on public.announcements for delete to authenticated using (true);

create policy "settings_select" on public.settings for select to authenticated using (true);
create policy "settings_insert" on public.settings for insert to authenticated with check (true);
create policy "settings_update" on public.settings for update to authenticated using (true);

create policy "late_deductions_log_select" on public.late_deductions_log for select to authenticated using (true);
create policy "late_deductions_log_insert" on public.late_deductions_log for insert to authenticated with check (true);
create policy "late_deductions_log_update" on public.late_deductions_log for update to authenticated using (true);

-- -----------------------------------------------------------------------------
-- Trigger: create employee row on auth signup
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.employees (id, email, first_name, last_name, role, designation)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'employee'),
    coalesce(new.raw_user_meta_data ->> 'designation', 'Employee')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Seed: default leave types
-- -----------------------------------------------------------------------------
insert into public.leave_types (name, description, default_days) values
  ('Annual Leave', 'Regular annual vacation leave', 20),
  ('Sick Leave', 'Medical and health related leave', 12),
  ('Personal Leave', 'Personal matters and emergencies', 5),
  ('Casual Leave', 'Short-term casual leave', 10),
  ('Maternity Leave', 'Maternity leave for new mothers', 90),
  ('Paternity Leave', 'Paternity leave for new fathers', 14)
on conflict (name) do nothing;

-- -----------------------------------------------------------------------------
-- Seed: default settings (single row)
-- -----------------------------------------------------------------------------
insert into public.settings (
  max_clocking_time,
  max_late_days,
  auto_clock_out_time,
  late_policy_deduction_per_day,
  company_name,
  company_address
)
select
  '11:00 AM',
  3,
  '7:30 PM',
  0.5,
  'Mavericks and Musers Media Pvt. Ltd.',
  array['79A, B Block Shyam Nagar', 'Near Brahmakumaris center Sujatganj', 'Kanpur, Uttar Pradesh, India']
where not exists (select 1 from public.settings limit 1);
