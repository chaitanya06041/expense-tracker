-- ============================================================
--  Expense Tracker — initial schema
--  Tables: auth_tokens, expenses, people,
--          split_records, split_shares, payment_logs
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Enum: expense category ────────────────────────────────────
create type category as enum (
  'Breakfast',
  'Lunch',
  'Dinner',
  'Fruits',
  'Petrol',
  'Cravings',
  'Room',
  'Grocery',
  'Personal',
  'Unsplitted',
  'Snacks'
);

-- ── auth_tokens ───────────────────────────────────────────────
-- Replaces the localStorage token whitelist.
-- The app generates a 64-char hex token on first login and stores
-- it here so any device/browser can validate it against the DB
-- instead of relying on localStorage being present.
create table auth_tokens (
  token       text        primary key,                  -- 64-char hex device token
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()        -- updated on each successful auth check
);

-- ── expenses ─────────────────────────────────────────────────
create table expenses (
  id          uuid           primary key default gen_random_uuid(),
  date        date           not null,
  category    category       not null,
  amount      numeric(12, 2) not null check (amount > 0),
  note        text,
  created_at  timestamptz    not null default now()
);

-- ── people ───────────────────────────────────────────────────
create table people (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  created_at  timestamptz not null default now()
);

-- ── split_records ─────────────────────────────────────────────
-- One record per "split event" tied to an expense.
create table split_records (
  id                uuid           primary key default gen_random_uuid(),
  expense_id        uuid           not null references expenses (id) on delete cascade,
  expense_amount    numeric(12, 2) not null check (expense_amount > 0),
  expense_category  category       not null,
  expense_note      text,
  date              date           not null,
  created_at        timestamptz    not null default now()
);

-- ── split_shares ──────────────────────────────────────────────
-- Each row is one person's share inside a split_record.
create table split_shares (
  id               uuid           primary key default gen_random_uuid(),
  split_record_id  uuid           not null references split_records (id) on delete cascade,
  person_id        uuid           not null references people (id) on delete cascade,
  amount           numeric(12, 2) not null check (amount >= 0),   -- original share amount
  paid             numeric(12, 2) not null default 0 check (paid >= 0), -- paid back so far
  created_at       timestamptz    not null default now(),
  constraint paid_lte_amount check (paid <= amount)
);

-- ── payment_logs ──────────────────────────────────────────────
-- Immutable log of every payment / balance-reduction event.
create table payment_logs (
  id          uuid           primary key default gen_random_uuid(),
  person_id   uuid           not null references people (id) on delete cascade,
  amount      numeric(12, 2) not null check (amount > 0),
  date        date           not null,
  note        text,
  created_at  timestamptz    not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────
create index on expenses       (date desc);
create index on split_records  (expense_id);
create index on split_shares   (split_record_id);
create index on split_shares   (person_id);
create index on payment_logs   (person_id);
create index on payment_logs   (date desc);

-- ── Row-Level Security ────────────────────────────────────────
-- auth_tokens must be readable/writable by the anon role so the
-- login flow (which runs before any user session exists) can
-- validate and insert tokens.  All other tables require a valid
-- token check via a security-definer helper function.

alter table auth_tokens    enable row level security;
alter table expenses       enable row level security;
alter table people         enable row level security;
alter table split_records  enable row level security;
alter table split_shares   enable row level security;
alter table payment_logs   enable row level security;

-- auth_tokens: anon can read (to validate), insert (on first login),
-- update last_seen, and delete (log out).
create policy "anon can validate tokens" on auth_tokens
  for select to anon using (true);

create policy "anon can insert tokens" on auth_tokens
  for insert to anon with check (true);

create policy "anon can update tokens" on auth_tokens
  for update to anon using (true) with check (true);

create policy "anon can delete own token" on auth_tokens
  for delete to anon using (true);

-- App data: anon role is allowed only when the request header
-- 'x-app-token' matches a row in auth_tokens.
-- We use a security-definer function so the check itself doesn't
-- recurse through RLS on auth_tokens.
create or replace function is_trusted_token()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from auth_tokens
    where token = current_setting('request.headers', true)::json->>'x-app-token'
  );
$$;

create policy "token-gated access" on expenses
  for all to anon using (is_trusted_token()) with check (is_trusted_token());

create policy "token-gated access" on people
  for all to anon using (is_trusted_token()) with check (is_trusted_token());

create policy "token-gated access" on split_records
  for all to anon using (is_trusted_token()) with check (is_trusted_token());

create policy "token-gated access" on split_shares
  for all to anon using (is_trusted_token()) with check (is_trusted_token());

create policy "token-gated access" on payment_logs
  for all to anon using (is_trusted_token()) with check (is_trusted_token());
