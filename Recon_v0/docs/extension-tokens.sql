-- Extension API tokens for Chrome extension authentication.
-- Each user can have one active token. The token is a random string;
-- we store a SHA-256 hash so even a DB leak won't expose raw tokens.

create table if not exists public.extension_tokens (
  user_id uuid primary key references public.users(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now()
);

-- Only service role should read/write.
alter table public.extension_tokens enable row level security;
