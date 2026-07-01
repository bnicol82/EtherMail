-- Phase J: org-wide usage counters for server quota gates

create table if not exists org_usage (
  org_id uuid not null references organizations(id) on delete cascade,
  metric text not null,
  period text not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (org_id, metric, period)
);

alter table org_usage enable row level security;

create policy "service role full access org_usage"
  on org_usage for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
