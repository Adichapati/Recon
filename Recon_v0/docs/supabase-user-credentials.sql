-- Create a separate credentials table for email/password logins.
-- This keeps OAuth-only users clean and avoids hardcoding auth providers in the `users` table.

create table if not exists public.user_credentials (
  user_id uuid primary key references public.users(id) on delete cascade,
  algo text not null,
  params jsonb not null,
  salt_b64 text not null,
  hash_b64 text not null,
  created_at timestamptz not null default now()
);

-- (Optional) Tighten access: only service role should read/write.
-- Enable RLS but do not add policies (service role bypasses RLS).
alter table public.user_credentials enable row level security;
