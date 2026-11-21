-- Task Management System — reconstructed Supabase schema.
--
-- This file did not exist until now: every migration run against this
-- project so far (recurrence, linked tasks, urgent-work fields, work-hour
-- tracking, meetings, meeting status, notifications) was handed over as
-- one-off SQL pasted into the Supabase SQL editor, never committed anywhere.
-- This reconstruction was built by reading every `sb.from(...)` call and
-- every `mapXRow()` function in src/team-task-dashboard/index.html, since
-- that's the only place the real column list survives.
--
-- It is written to be SAFE TO RUN AGAINST THE LIVE DATABASE: every
-- statement uses IF NOT EXISTS, so running this against the current
-- production project should be a no-op (confirming this file matches
-- reality) rather than an error. It's also enough to stand up a fresh
-- Supabase project from empty.
--
-- IMPORTANT: this was reconstructed from application code, not exported
-- from Postgres — column types, defaults and constraints are my best
-- inference from how the app uses each field (e.g. *_date columns store
-- 'YYYY-MM-DD' strings, so they're typed `date`). Before trusting this as
-- the single source of truth, run it against a scratch/staging Supabase
-- project and diff the result against the real one (Database -> Schema
-- Visualizer, or `\d+ <table>` in the SQL editor) and fix any mismatch
-- here. From this point forward, every new migration should be added to
-- this folder instead of being a one-off paste into the dashboard.

-- ============================================================
-- departments
-- ============================================================
create table if not exists departments (
  id bigint generated always as identity primary key,
  name text not null unique
);

-- ============================================================
-- projects
-- ============================================================
create table if not exists projects (
  id bigint generated always as identity primary key,
  name text not null unique,
  mascot text
);

-- ============================================================
-- employees
-- ============================================================
create table if not exists employees (
  id bigint generated always as identity primary key,
  name text not null,
  role text not null check (role in ('admin', 'member')),
  department text not null,
  title text,
  join_date date,
  active boolean not null default true,
  -- Human-typeable login code. See the security note at the bottom of this
  -- file — this is currently a DETERMINISTIC hash of the employee's name,
  -- not a real secret, and should be revisited.
  token text not null unique,
  email text,
  super_admin boolean not null default false
);

-- ============================================================
-- tasks
-- ============================================================
create table if not exists tasks (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  assigned_to bigint references employees(id),
  assigned_by bigint references employees(id),
  department text,
  project text,
  created_date date,
  start_date date,
  due_date date,
  priority text,
  level integer,
  status text not null default 'Not Started',
  estimated_hours numeric,
  actual_hours numeric,
  completion_date date,
  progress integer not null default 0,
  completion_notes text
);

-- Added later — recurring tasks (daily/weekly/monthly/yearly). Probed via
-- `tasks.select('recurrence').limit(1)` in DB.fetchAll(); the app runs
-- without it, just with recurrence disabled.
alter table tasks add column if not exists recurrence text;

-- Added later — "ask a teammate for something" resource requests create a
-- task linked back to the task that spawned it.
alter table tasks add column if not exists linked_task_id bigint references tasks(id);

-- Added later — urgent/unplanned work tracking + daily scheduling order.
alter table tasks add column if not exists is_urgent boolean not null default false;
alter table tasks add column if not exists urgency_reason text;
alter table tasks add column if not exists schedule_type text not null default 'flexible';
alter table tasks add column if not exists daily_sequence integer;

-- Added later — Work Hours / Time Log feature (actual clock start/end time
-- of day, stored as text 'HH:MM', separate from estimated/actual hours).
alter table tasks add column if not exists start_time text;
alter table tasks add column if not exists end_time text;

-- ============================================================
-- task_comments
-- ============================================================
create table if not exists task_comments (
  id bigint generated always as identity primary key,
  task_id bigint not null references tasks(id) on delete cascade,
  text text not null,
  author_id bigint references employees(id),
  type text not null default 'comment',
  at timestamptz not null default now()
);

-- ============================================================
-- meetings — a dedicated table (not a task) since a meeting has multiple
-- attendees. Entire feature, including `status`, was added after the app's
-- initial build; `meetingsSupported` / `meetingStatusSupported` probes in
-- DB.fetchAll() let the app degrade gracefully if this hasn't been run yet.
-- ============================================================
create table if not exists meetings (
  id bigint generated always as identity primary key,
  title text not null,
  meeting_type text not null default 'Team Huddle',
  organizer_id bigint references employees(id),
  attendee_ids bigint[] not null default '{}',
  department text,
  meeting_date date,
  start_time text,
  end_time text,
  agenda text,
  created_at timestamptz not null default now()
);

-- Added later — meeting disposition (Scheduled / Done / Cancelled / Postponed).
alter table meetings add column if not exists status text not null default 'Scheduled';

-- ============================================================
-- notifications — in-app bell-icon notifications (NOT email; see the
-- separate email pipeline in employees-task-management's
-- scripts/send-task-emails.js). Optional feature: DB.fetchAll() swallows
-- errors from these two tables so the rest of the app still loads if this
-- migration hasn't been run.
-- ============================================================
create table if not exists notifications (
  id bigint generated always as identity primary key,
  sender_id bigint references employees(id),
  recipient_id bigint references employees(id),
  type text not null default 'admin',
  title text not null,
  body text,
  created_at timestamptz not null default now()
);

create table if not exists notification_reads (
  notification_id bigint not null references notifications(id) on delete cascade,
  employee_id bigint not null references employees(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, employee_id)
);

-- ============================================================
-- SECURITY NOTE — read before enabling Row Level Security
-- ============================================================
-- As of this writing, every table above is almost certainly reachable with
-- NO row-level restriction via the public anon/publishable key that's
-- embedded directly in index.html's page source. The app's "login" (an
-- access-code screen) is enforced entirely in client-side JavaScript —
-- DB.fetchAll() downloads every employee record (including each one's
-- literal `token` and `super_admin` flag) and every task BEFORE that
-- screen is ever passed. Anyone who loads the public site and opens
-- devtools can read `DB.employees` / `DB.tasks` directly, with no login
-- required, and the "access code" itself is a deterministic hash of the
-- employee's name (see `deterministicToken()` in index.html) rather than a
-- real secret.
--
-- Enabling `alter table ... enable row level security;` on these tables
-- WITHOUT also adding real identity-aware policies will break the app
-- (every anon-key read/write will start failing). Properly closing this
-- gap means moving login onto real Supabase Auth (the existing magic-link
-- `signInWithOtp` flow is the natural path) and writing RLS policies keyed
-- to `auth.uid()`, which is a larger, separate piece of work — tracked
-- outside this file rather than attempted here as a drive-by column
-- change.
