-- Phase F: sessions, vault_shared flags, demo seed, RLS

alter table org_policies
  add column if not exists organization_name text not null default 'Organization',
  add column if not exists vault_shared jsonb not null default '{}';

create table if not exists org_sessions (
  token uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  member_id uuid not null references org_members(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists org_sessions_member on org_sessions (member_id);
create index if not exists org_sessions_expires on org_sessions (expires_at);

-- Demo organization (stable UUID for EtherMail client org-demo mapping)
insert into organizations (id, name, plan_tier)
values ('00000000-0000-4000-8000-000000000001', 'Demo Organization', 'enterprise')
on conflict (id) do update set name = excluded.name, plan_tier = excluded.plan_tier;

insert into org_policies (org_id, organization_name, features, enforce_locks, vault_shared)
values (
  '00000000-0000-4000-8000-000000000001',
  'Demo Organization',
  '{}'::jsonb,
  true,
  '{"vault-work": true}'::jsonb
)
on conflict (org_id) do update set
  organization_name = excluded.organization_name,
  vault_shared = excluded.vault_shared;

insert into org_members (id, org_id, email, name, role, status, joined_at)
values
  (
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000001',
    'sarah@acme.com',
    'Sarah Johnson',
    'admin',
    'active',
    '2025-01-15T00:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000012',
    '00000000-0000-4000-8000-000000000001',
    'mike@acme.com',
    'Mike Chen',
    'member',
    'active',
    '2025-02-01T00:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000013',
    '00000000-0000-4000-8000-000000000001',
    'pending@acme.com',
    'Pending User',
    'member',
    'invited',
    null
  )
on conflict (org_id, email) do nothing;

insert into sso_configs (org_id, enabled, provider, domain, enforce_sso)
values (
  '00000000-0000-4000-8000-000000000001',
  false,
  'none',
  'acme.com',
  false
)
on conflict (org_id) do nothing;

insert into vault_shares (id, org_id, vault_id, permission)
values (
  '00000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000001',
  'vault-work',
  'write'
)
on conflict (org_id, vault_id) do nothing;

insert into vault_share_members (share_id, member_id)
values
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000011'),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000012')
on conflict do nothing;

-- RLS: block direct anon access; Edge Function uses service role
alter table organizations enable row level security;
alter table org_policies enable row level security;
alter table org_members enable row level security;
alter table sso_configs enable row level security;
alter table vault_shares enable row level security;
alter table vault_share_members enable row level security;
alter table audit_events enable row level security;
alter table org_sessions enable row level security;

create policy "service role full access organizations"
  on organizations for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role full access org_policies"
  on org_policies for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role full access org_members"
  on org_members for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role full access sso_configs"
  on sso_configs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role full access vault_shares"
  on vault_shares for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role full access vault_share_members"
  on vault_share_members for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role full access audit_events"
  on audit_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role full access org_sessions"
  on org_sessions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
