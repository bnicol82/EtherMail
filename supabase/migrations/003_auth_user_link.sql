-- Phase H: link org members to Supabase Auth users

alter table org_members
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists org_members_auth_user_id
  on org_members (auth_user_id)
  where auth_user_id is not null;

create index if not exists org_members_email_org
  on org_members (org_id, email);
