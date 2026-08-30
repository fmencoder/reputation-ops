-- Search-visibility monitoring schema.
--
-- Scope: this schema records what search engines return for the subject's name
-- over time. It intentionally has no tables for publisher outreach, removal
-- requests, or deindexing submissions.

create table if not exists scans (
  id            text primary key,
  started_at    timestamptz not null,
  finished_at   timestamptz not null,
  queries_run   integer not null check (queries_run >= 0),
  queries_failed integer not null check (queries_failed >= 0),
  results_seen  integer not null check (results_seen >= 0)
);

create table if not exists urls (
  normalized_url text primary key,
  domain         text not null,
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  control        text not null check (control in ('owned','third_party','government','unknown')),
  sentiment      text not null check (sentiment in ('negative','neutral','positive','unrelated'))
);

create index if not exists urls_domain_idx on urls (domain);

create table if not exists observations (
  id             bigserial primary key,
  scan_id        text not null references scans(id) on delete cascade,
  normalized_url text not null references urls(normalized_url) on delete cascade,
  query_id       text not null,
  engine         text not null check (engine in ('google','bing','duckduckgo')),
  position       integer not null check (position >= 1),
  title          text not null default '',
  snippet        text not null default '',
  serp_weight    integer not null check (serp_weight between 0 and 100),
  observed_at    timestamptz not null,
  -- One row per URL per query per scan; a re-run of the same scan is idempotent.
  unique (scan_id, query_id, normalized_url)
);

create index if not exists observations_url_time_idx
  on observations (normalized_url, observed_at desc);

create table if not exists alerts (
  id             bigserial primary key,
  scan_id        text not null references scans(id) on delete cascade,
  kind           text not null,
  normalized_url text not null,
  query_id       text not null,
  engine         text not null,
  detail         text not null,
  created_at     timestamptz not null default now(),
  acknowledged_at timestamptz
);

-- Owned assets the subject controls and may legitimately optimize.
create table if not exists owned_assets (
  id          bigserial primary key,
  url         text not null unique,
  domain      text not null,
  label       text not null,
  notes       text,
  created_at  timestamptz not null default now()
);

-- This data is about one identifiable person. Lock it to the service role and
-- add explicit policies before exposing any of it to a client.
alter table scans        enable row level security;
alter table urls         enable row level security;
alter table observations enable row level security;
alter table alerts       enable row level security;
alter table owned_assets enable row level security;
