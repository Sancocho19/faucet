create table if not exists users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  referral_code text unique not null,
  referred_by text references users(id) on delete set null,
  streak integer not null default 1,
  last_login_date date,
  xp integer not null default 0,
  is_admin boolean not null default false,
  referral_count integer not null default 0,
  referral_earned bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists balances (
  user_id text not null references users(id) on delete cascade,
  coin_id text not null,
  amount bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, coin_id)
);

create table if not exists claim_cooldowns (
  user_id text primary key references users(id) on delete cascade,
  next_claim_at timestamptz not null
);

create table if not exists ledger (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  coin_id text not null,
  amount bigint not null,
  type text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists earn_events (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  source text not null,
  reward bigint not null,
  coin_id text not null,
  external_ref text,
  created_at timestamptz not null default now()
);

create table if not exists withdrawal_requests (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  coin_id text not null,
  amount bigint not null,
  address text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists lottery_tickets (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  qty integer not null,
  created_at timestamptz not null default now()
);

create table if not exists lottery_state (
  id integer primary key,
  pool bigint not null default 0
);

insert into lottery_state (id, pool) values (1, 300000)
on conflict (id) do nothing;
