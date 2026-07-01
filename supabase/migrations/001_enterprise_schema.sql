-- EtherMail enterprise schema (Phase B)
-- Organizations, policy, members, audit, shared vaults, SSO

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_tier text not null default 'team' check (plan_tier in ('free', 'pro', 'team', 'enterprise')),
  created_at timestamptz not null default now()
);

create table if not exists org_policies (
  org_id uuid primary key references organizations(id) on delete cascade,
  features jsonb not null default '{}',
  enforce_locks boolean not null default true,
  quota_overrides jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'member' check (role in ('member', 'admin', 'owner')),
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended')),
  invited_at timestamptz default now(),
  joined_at timestamptz,
  unique (org_id, email)
);

create table if not exists sso_configs (
  org_id uuid primary key references organizations(id) on delete cascade,
  enabled boolean not null default false,
  provider text not null default 'none',
  tenant_id text,
  client_id text,
  domain text,
  enforce_sso boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists vault_shares (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  vault_id text not null,
  permission text not null default 'read' check (permission in ('read', 'write', 'admin')),
  created_at timestamptz not null default now(),
  unique (org_id, vault_id)
);

create table if not exists vault_share_members (
  share_id uuid not null references vault_shares(id) on delete cascade,
  member_id uuid not null references org_members(id) on delete cascade,
  primary key (share_id, member_id)
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  member_id uuid references org_members(id) on delete set null,
  category text not null,
  action text not null,
  feature_id text,
  detail text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_org_created on audit_events (org_id, created_at desc);

-- RLS placeholders (enable per-table in production)
-- alter table org_policies enable row level security;
-- create policy "members read policy" on org_policies for select using (org_id = auth.jwt()->>'org_id');
