-- Step 1 of 2 for closing the login/data-access security gap (see the
-- SECURITY NOTE at the bottom of schema.sql for background).
--
-- SAFE TO RUN RIGHT NOW. This does not change anything about how the app
-- behaves today — Row Level Security is NOT enabled by this file (that's
-- 003-enable-rls.sql, a separate, deliberate cutover). This just:
--   1. Adds a column linking each employee to their real Supabase Auth user.
--   2. Adds a function the app calls once per sign-in to populate it.
--
-- Run this now, then let your team sign in with email normally for a few
-- days (every sign-in calls this function automatically — nothing manual
-- needed), and check the query at the bottom before running
-- 003-enable-rls.sql, so nobody gets locked out.

alter table employees add column if not exists auth_user_id uuid references auth.users(id);
create unique index if not exists employees_auth_user_id_key on employees(auth_user_id) where auth_user_id is not null;

-- SECURITY DEFINER: runs with elevated privileges so it can write to
-- employees even once RLS is on and a plain client can't. It only ever
-- touches the one row whose email matches the CALLER'S OWN verified auth
-- email (auth.jwt() ->> 'email'), and only when that row hasn't already
-- been claimed by someone else — so it can't be used to take over another
-- employee's record or to write any column other than auth_user_id.
create or replace function link_my_employee_record()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if my_email = '' then
    return;
  end if;
  update employees
  set auth_user_id = auth.uid()
  where lower(email) = my_email
    and active = true
    and auth_user_id is null;
end;
$$;

grant execute on function link_my_employee_record() to authenticated;

-- Run this after a few days to see who's covered before enabling RLS:
--   select name, email, auth_user_id is not null as has_signed_in
--   from employees
--   where active = true
--   order by has_signed_in, name;
-- Every active row should show has_signed_in = true before you run
-- 003-enable-rls.sql — anyone still false will be locked out the moment
-- RLS goes on, since there would be nothing yet linking their session to
-- their employee row.
