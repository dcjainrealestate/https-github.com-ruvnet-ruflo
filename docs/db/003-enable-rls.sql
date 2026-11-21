-- Step 2 of 2 for closing the login/data-access security gap. This is the
-- actual breaking cutover — read this whole file before running it.
--
-- DO NOT RUN THIS until:
--   1. 002-add-auth-user-id.sql has been run.
--   2. Every ACTIVE employee has signed in with email at least once since
--      then (check with the query at the bottom of that file — every row
--      should show has_signed_in = true). Anyone who hasn't will be unable
--      to load any data the moment this runs, because nothing will yet
--      link their session to their employee row.
--   3. You've tried this against a staging/duplicate Supabase project
--      first if at all possible. I (Claude) cannot test this against your
--      real database — I don't have credentials to it — so this is my
--      best-effort translation of the app's actual permission logic into
--      Postgres policies, not something that's been run and verified.
--      A wrong policy here can either lock everyone out or leave a gap
--      open; a staging run is the only way to be sure before production.
--
-- What this does: requires every table read/write to come from a real,
-- authenticated Supabase session (closing the current gap where the public
-- anon key, sitting in the page source, can read or write everything with
-- no login at all) and keeps every existing capability working for
-- legitimate signed-in use. It deliberately does NOT try to replicate
-- every department-scoping nuance the client already filters on (e.g. a
-- non-super-admin seeing all employees except other admins) — that stays
-- enforced in the UI only, same as today. The goal here is closing
-- unauthenticated access, which is the actual critical gap; refining
-- within-team visibility further is separate follow-up work.

-- ============================================================
-- Helper: resolve the calling request's own employee row.
-- SECURITY DEFINER so it can be called from inside other policies without
-- those policies recursing into themselves.
-- ============================================================
create or replace function app_current_employee()
returns employees
language sql
security definer
stable
set search_path = public
as $$
  select * from employees where auth_user_id = auth.uid() limit 1;
$$;

create or replace function app_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select role = 'admin' from employees where auth_user_id = auth.uid()), false);
$$;

-- ============================================================
-- employees
-- Read: any signed-in user (needed for assignee pickers, the Team page,
-- "Send Update" recipient list, etc. — the app has never scoped this down
-- client-side either). Write: admins only, EXCEPT the narrow
-- link_my_employee_record() path from 002, which runs as its own
-- SECURITY DEFINER function and bypasses these policies entirely.
-- ============================================================
alter table employees enable row level security;

create policy employees_select_authenticated on employees
  for select to authenticated using (true);

create policy employees_write_admin_only on employees
  for all to authenticated using (app_is_admin()) with check (app_is_admin());

-- ============================================================
-- departments / projects — read for everyone signed in; the Settings page
-- that manages these is already admin-only in the UI, so write is too.
-- ============================================================
alter table departments enable row level security;
create policy departments_select_authenticated on departments for select to authenticated using (true);
create policy departments_write_admin_only on departments for all to authenticated using (app_is_admin()) with check (app_is_admin());

alter table projects enable row level security;
create policy projects_select_authenticated on projects for select to authenticated using (true);
create policy projects_write_admin_only on projects for all to authenticated using (app_is_admin()) with check (app_is_admin());

-- ============================================================
-- tasks
-- Read: any signed-in user (My Tasks / Team Tasks / dashboards all read
-- broadly today). Insert: any signed-in user (everyone can create tasks —
-- for themselves, via photo import, or for a teammate via a resource
-- request). Update: the assignee, the person who assigned it, or an
-- admin. Delete: admin only (judgment call — the UI's delete button
-- doesn't look role-gated everywhere, but deletion is the one operation
-- worth erring restrictive on; loosen with a migration if this turns out
-- too tight for how your team actually uses it).
-- ============================================================
alter table tasks enable row level security;

create policy tasks_select_authenticated on tasks for select to authenticated using (true);

create policy tasks_insert_authenticated on tasks for insert to authenticated with check (true);

create policy tasks_update_owner_or_admin on tasks for update to authenticated
  using (
    app_is_admin()
    or assigned_to = (select id from app_current_employee())
    or assigned_by = (select id from app_current_employee())
  )
  with check (
    app_is_admin()
    or assigned_to = (select id from app_current_employee())
    or assigned_by = (select id from app_current_employee())
  );

create policy tasks_delete_admin_only on tasks for delete to authenticated using (app_is_admin());

-- ============================================================
-- task_comments — anyone signed in can read and add comments (matches
-- DB.addComment() having no role check); editing/removing someone else's
-- comment is admin-only.
-- ============================================================
alter table task_comments enable row level security;
create policy task_comments_select_authenticated on task_comments for select to authenticated using (true);
create policy task_comments_insert_authenticated on task_comments for insert to authenticated with check (true);
create policy task_comments_update_delete_admin_only on task_comments for update to authenticated using (app_is_admin()) with check (app_is_admin());
create policy task_comments_delete_admin_only on task_comments for delete to authenticated using (app_is_admin());

-- ============================================================
-- meetings — "Add Meeting" is available to every role in the app (admin
-- dashboard, My Day, member dashboard all show it), so insert is open to
-- any signed-in user. Update: the organizer or an admin. Delete:
-- admin-only (same reasoning as tasks).
-- ============================================================
alter table meetings enable row level security;
create policy meetings_select_authenticated on meetings for select to authenticated using (true);
create policy meetings_insert_authenticated on meetings for insert to authenticated with check (true);
create policy meetings_update_organizer_or_admin on meetings for update to authenticated
  using (app_is_admin() or organizer_id = (select id from app_current_employee()))
  with check (app_is_admin() or organizer_id = (select id from app_current_employee()));
create policy meetings_delete_admin_only on meetings for delete to authenticated using (app_is_admin());

-- ============================================================
-- notifications / notification_reads — in-app bell notifications (not
-- email). Read only your own (sent to you, sent by you, or a broadcast
-- with no specific recipient); insert open to any signed-in user, matching
-- how renderSendNotificationModal() isn't gated to admins in the client.
-- ============================================================
alter table notifications enable row level security;
create policy notifications_select_own on notifications for select to authenticated
  using (
    recipient_id is null
    or recipient_id = (select id from app_current_employee())
    or sender_id = (select id from app_current_employee())
    or app_is_admin()
  );
create policy notifications_insert_authenticated on notifications for insert to authenticated with check (true);

alter table notification_reads enable row level security;
create policy notification_reads_own on notification_reads for all to authenticated
  using (employee_id = (select id from app_current_employee()))
  with check (employee_id = (select id from app_current_employee()));

-- ============================================================
-- Rollback, if something breaks after running this:
--   alter table employees disable row level security;
--   alter table departments disable row level security;
--   alter table projects disable row level security;
--   alter table tasks disable row level security;
--   alter table task_comments disable row level security;
--   alter table meetings disable row level security;
--   alter table notifications disable row level security;
--   alter table notification_reads disable row level security;
-- This restores today's fully-open behavior immediately (policies stay
-- defined but inactive) while you fix whichever policy was wrong, rather
-- than needing to drop and recreate anything.
