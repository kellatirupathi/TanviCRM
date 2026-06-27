-- ════════════════════════════════════════════════════════════════════
-- TanviCRM — Supabase / PostgreSQL schema
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- before seeding. It is idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";   -- for gen_random_uuid()

-- ── Enums ───────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('admin', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type customer_segment as enum ('VIP', 'Regular', 'New', 'Inactive');
exception when duplicate_object then null; end $$;

-- ── Users ───────────────────────────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  role          user_role not null default 'staff',
  avatar_color  text not null default '#6B2C4F',
  active        boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Customers ───────────────────────────────────────────────────────
create table if not exists public.customers (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  phone              text not null,
  email              text not null default '',
  address            jsonb not null default '{"line":"","city":"Hyderabad","pincode":""}'::jsonb,
  style_preferences  text[] not null default '{}',
  notes              text not null default '',
  avatar_color       text not null default '#6B2C4F',
  total_spend        numeric(12,2) not null default 0,
  purchase_count     integer not null default 0,
  first_purchase_at  timestamptz,
  last_purchase_at   timestamptz,
  segment            customer_segment not null default 'Inactive',
  created_by         uuid references public.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists customers_segment_idx     on public.customers (segment);
create index if not exists customers_total_spend_idx on public.customers (total_spend desc);
create index if not exists customers_phone_idx       on public.customers (phone);
create index if not exists customers_name_trgm_idx   on public.customers using gin (lower(name) gin_trgm_ops);

-- trigram extension powers fast ILIKE name search (optional but nice)
create extension if not exists pg_trgm;

-- ── Purchases ───────────────────────────────────────────────────────
-- `items` is a JSONB array of { name, category, quantity, unitPrice } —
-- mirrors the embedded line-items from the Mongo design.
create table if not exists public.purchases (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers(id) on delete cascade,
  date           timestamptz not null default now(),
  items          jsonb not null default '[]'::jsonb,
  amount         numeric(12,2) not null default 0,
  payment_method text not null default 'UPI',
  invoice_no     text,
  notes          text not null default '',
  created_by     uuid references public.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists purchases_customer_idx      on public.purchases (customer_id);
create index if not exists purchases_date_idx          on public.purchases (date desc);
create index if not exists purchases_customer_date_idx on public.purchases (customer_id, date desc);

-- ════════════════════════════════════════════════════════════════════
-- RPC functions for analytics aggregations (replace Mongo $group pipelines)
-- Called from the backend via supabase.rpc(...).
-- ════════════════════════════════════════════════════════════════════

-- Revenue + order count between two timestamps (end optional).
create or replace function public.revenue_between(p_start timestamptz, p_end timestamptz default null)
returns table(total numeric, count bigint)
language sql stable as $$
  select coalesce(sum(amount), 0)::numeric as total, count(*)::bigint as count
  from public.purchases
  where date >= p_start
    and (p_end is null or date <= p_end);
$$;

-- Revenue & units per product category (unnests the JSONB items array).
create or replace function public.category_breakdown()
returns table(category text, revenue numeric, units bigint, orders bigint)
language sql stable as $$
  select
    it->>'category'                                            as category,
    coalesce(sum( (it->>'quantity')::numeric * (it->>'unitPrice')::numeric ), 0)::numeric as revenue,
    coalesce(sum( (it->>'quantity')::numeric ), 0)::bigint     as units,
    count(*)::bigint                                           as orders
  from public.purchases p
  cross join lateral jsonb_array_elements(p.items) as it
  group by it->>'category'
  order by revenue desc;
$$;

-- Monthly revenue trend since p_start (one row per month that has data).
create or replace function public.revenue_trend(p_start timestamptz)
returns table(yr int, mon int, revenue numeric, orders bigint)
language sql stable as $$
  select
    extract(year  from date)::int as yr,
    extract(month from date)::int as mon,
    coalesce(sum(amount),0)::numeric as revenue,
    count(*)::bigint as orders
  from public.purchases
  where date >= p_start
  group by 1, 2
  order by 1, 2;
$$;

-- For each customer, the id of their earliest purchase (stable first-purchase id).
create or replace function public.first_purchase_ids()
returns table(customer_id uuid, first_purchase_id uuid)
language sql stable as $$
  select distinct on (customer_id)
    customer_id,
    id as first_purchase_id
  from public.purchases
  order by customer_id, date asc, id asc;
$$;

-- Segment counts.
create or replace function public.segment_counts()
returns table(segment customer_segment, count bigint)
language sql stable as $$
  select segment, count(*)::bigint from public.customers group by segment;
$$;
