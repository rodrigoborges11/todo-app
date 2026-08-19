-- todo-cenas — schema Supabase
-- Corre isto no SQL Editor do teu projeto Supabase

create table if not exists areas (
  id          text primary key,
  name        text not null,
  color_token text not null,
  icon        text,
  position    integer not null default 0,
  is_default  boolean not null default false
);

create table if not exists lists (
  id         text primary key,
  area_id    text not null references areas(id) on delete cascade,
  name       text not null,
  color      text,
  position   integer not null default 0,
  is_default boolean not null default false
);

create table if not exists tags (
  id      text primary key,
  area_id text references areas(id) on delete cascade,
  name    text not null,
  color   text
);

create table if not exists tasks (
  id              text primary key,
  area_id         text not null references areas(id) on delete cascade,
  list_id         text not null references lists(id) on delete cascade,
  parent_id       text references tasks(id) on delete cascade,
  source_event_id text,
  title           text not null,
  description     text,
  due_at          bigint,
  priority        text not null default 'none',
  is_completed    boolean not null default false,
  completed_at    bigint,
  position        integer not null default 0,
  created_at      bigint not null,
  updated_at      bigint not null,
  is_example      boolean not null default false
);

create table if not exists task_tags (
  id      serial primary key,
  task_id text not null references tasks(id) on delete cascade,
  tag_id  text not null references tags(id) on delete cascade,
  unique(task_id, tag_id)
);

create table if not exists settings (
  id                      text primary key,
  schema_version          integer,
  theme                   text,
  default_view            text,
  active_area_filter      text,
  sync_window_past_days   integer,
  sync_window_future_days integer,
  last_export_at          bigint,
  created_at              bigint
);

-- Calendários (Apple .ics e futuras integrações)
create table if not exists accounts (
  id           text primary key,
  type         text not null,
  email        text,
  display_name text,
  area_id      text references areas(id) on delete set null,
  status       text,
  last_sync_at bigint,
  sync_token   text
);

create table if not exists tokens (
  account_id   text primary key references accounts(id) on delete cascade,
  access_token text,
  refresh_token text,
  expires_at   bigint
);

create table if not exists calendars (
  id         text primary key,
  account_id text not null references accounts(id) on delete cascade,
  name       text,
  color      text,
  is_visible boolean not null default true
);

create table if not exists events (
  id           text primary key,
  calendar_id  text not null references calendars(id) on delete cascade,
  account_id   text not null references accounts(id) on delete cascade,
  title        text,
  starts_at    bigint,
  ends_at      bigint,
  is_all_day   boolean not null default false,
  location     text,
  updated_at   bigint,
  is_cancelled boolean not null default false
);

create index if not exists events_starts_at_idx on events(starts_at);
create index if not exists events_account_starts_idx on events(account_id, starts_at);

-- App single-user: RLS desativado (não há auth)
alter table areas      disable row level security;
alter table lists      disable row level security;
alter table tags       disable row level security;
alter table tasks      disable row level security;
alter table task_tags  disable row level security;
alter table settings   disable row level security;
alter table accounts   disable row level security;
alter table tokens     disable row level security;
alter table calendars  disable row level security;
alter table events     disable row level security;

-- Migração: eventos manuais (sem conta/calendário importado)
alter table events alter column account_id drop not null;
alter table events alter column calendar_id drop not null;
alter table events add column if not exists area_id text references areas(id) on delete set null;
