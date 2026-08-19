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

-- App single-user: RLS desativado (não há auth)
alter table areas     disable row level security;
alter table lists     disable row level security;
alter table tags      disable row level security;
alter table tasks     disable row level security;
alter table task_tags disable row level security;
alter table settings  disable row level security;
