-- Phase M: member-scoped RLS for authenticated Supabase users (defense in depth).
-- Edge Function continues to use service_role; these policies protect direct PostgREST access.

create schema if not exists private;

create or replace function private.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public, private
as $$
  select id
  from org_members
  where auth_user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function private.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public, private
as $$
  select org_id
  from org_members
  where auth_user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function private.is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce(
    (
      select role in ('admin', 'owner')
      from org_members
      where auth_user_id = auth.uid()
        and status = 'active'
      limit 1
    ),
    false
  );
$$;

create or replace function private.can_read_vault_share(share_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from vault_shares vs
    where vs.id = share_id
      and vs.org_id = private.current_org_id()
      and (
        private.is_org_admin()
        or exists (
          select 1
          from vault_share_members vsm
          where vsm.share_id = vs.id
            and vsm.member_id = private.current_member_id()
        )
      )
  );
$$;

revoke all on schema private from public;
grant usage on schema private to postgres, service_role, authenticated;

revoke all on function private.current_member_id() from public;
revoke all on function private.current_org_id() from public;
revoke all on function private.is_org_admin() from public;
revoke all on function private.can_read_vault_share(uuid) from public;

grant execute on function private.current_member_id() to authenticated, service_role;
grant execute on function private.current_org_id() to authenticated, service_role;
grant execute on function private.is_org_admin() to authenticated, service_role;
grant execute on function private.can_read_vault_share(uuid) to authenticated, service_role;

-- Organizations
create policy "authenticated read own organization"
  on organizations for select
  to authenticated
  using (id = private.current_org_id());

-- Org policy
create policy "authenticated read own org policy"
  on org_policies for select
  to authenticated
  using (org_id = private.current_org_id());

-- Members directory (same org)
create policy "authenticated read org members"
  on org_members for select
  to authenticated
  using (org_id = private.current_org_id());

-- SSO config (needed for login UI)
create policy "authenticated read own sso config"
  on sso_configs for select
  to authenticated
  using (org_id = private.current_org_id());

-- Vault shares: admins see all; members see assigned shares
create policy "authenticated read accessible vault shares"
  on vault_shares for select
  to authenticated
  using (
    org_id = private.current_org_id()
    and (
      private.is_org_admin()
      or exists (
        select 1
        from vault_share_members vsm
        where vsm.share_id = vault_shares.id
          and vsm.member_id = private.current_member_id()
      )
    )
  );

create policy "authenticated read accessible vault share members"
  on vault_share_members for select
  to authenticated
  using (private.can_read_vault_share(share_id));

-- Audit: admins see org-wide; members see their own events
create policy "authenticated read scoped audit events"
  on audit_events for select
  to authenticated
  using (
    org_id = private.current_org_id()
    and (
      private.is_org_admin()
      or member_id = private.current_member_id()
    )
  );

-- Sessions: members only see their own
create policy "authenticated read own org sessions"
  on org_sessions for select
  to authenticated
  using (member_id = private.current_member_id());

-- Usage counters (matches GET /org/usage for any authenticated member)
create policy "authenticated read own org usage"
  on org_usage for select
  to authenticated
  using (org_id = private.current_org_id());
