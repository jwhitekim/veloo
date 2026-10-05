-- veloo — Supabase 스키마
-- Supabase SQL Editor에서 한 번에 실행

-- ── users ──────────────────────────────────────────────────────────────────
create table if not exists users (
  id            uuid        default gen_random_uuid() primary key,
  username      text        unique not null,
  password_hash text        not null,
  is_approved   boolean     not null default false,
  created_at    timestamptz not null default now()
);

-- ── sessions ───────────────────────────────────────────────────────────────
create table if not exists sessions (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        not null references users(id) on delete cascade,
  token      text        unique not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_token_idx      on sessions (token);
create index if not exists sessions_expires_at_idx on sessions (expires_at);

-- ── todos ──────────────────────────────────────────────────────────────────
create table if not exists todos (
  id          bigserial   primary key,
  user_id     uuid        not null references users(id) on delete cascade,
  name        text        not null,
  memo        text        not null default '',
  priority    text        not null default 'normal',
  deadline    text        not null default '',
  done        boolean     not null default false,
  ai_strategy text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists todos_user_id_idx on todos (user_id);

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists todos_updated_at on todos;
create trigger todos_updated_at
  before update on todos
  for each row execute function update_updated_at();

-- ── steps ──────────────────────────────────────────────────────────────────
create table if not exists steps (
  id          bigserial primary key,
  todo_id     bigint    not null references todos(id) on delete cascade,
  text        text      not null,
  done        boolean   not null default false,
  order_index integer   not null default 0
);

create index if not exists steps_todo_id_idx on steps (todo_id);

-- ── paper_history ──────────────────────────────────────────────────────────
create table if not exists paper_history (
  id         bigserial   primary key,
  user_id    uuid        not null references users(id) on delete cascade,
  query      text,
  paper_id   text,
  title      text,
  result     jsonb       not null,
  created_at timestamptz not null default now()
);

create index if not exists paper_history_user_id_idx    on paper_history (user_id);
create index if not exists paper_history_paper_id_idx   on paper_history (paper_id);
create index if not exists paper_history_created_at_idx on paper_history (created_at desc);

-- ── translation_history ────────────────────────────────────────────────────
create table if not exists translation_history (
  id              bigserial   primary key,
  user_id         uuid        not null references users(id) on delete cascade,
  source_text     text        not null,
  translated_text text        not null,
  type            text        not null check (type in ('word', 'sentence')),
  created_at      timestamptz not null default now()
);

create index if not exists translation_history_user_id_idx    on translation_history (user_id);
create index if not exists translation_history_source_idx     on translation_history (source_text);
create index if not exists translation_history_created_at_idx on translation_history (created_at desc);

-- ── arch_history ───────────────────────────────────────────────────────────
create table if not exists arch_history (
  id          bigserial   primary key,
  user_id     uuid        not null references users(id) on delete cascade,
  image_name  text,
  explanation jsonb       not null,
  feedback    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists arch_history_user_id_idx    on arch_history (user_id);
create index if not exists arch_history_created_at_idx on arch_history (created_at desc);

create table if not exists contextor_history (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references users(id) on delete cascade,
  query      text not null,
  result     jsonb not null,
  created_at timestamptz default now()
);
alter table contextor_history
  add column if not exists user_id uuid references users(id) on delete cascade;
create index if not exists contextor_history_user_id_idx on contextor_history (user_id);
create index if not exists contextor_history_query_idx on contextor_history (query);

-- ── 캘린더·알림·주간 리뷰 마이그레이션 ────────────────────────────────────────
alter table todos
  add column if not exists start_time   timestamptz,
  add column if not exists end_time     timestamptz,
  add column if not exists remind_at    timestamptz,
  add column if not exists reminded     boolean not null default false,
  add column if not exists completed_at timestamptz;

alter table users
  add column if not exists email text;

create index if not exists todos_start_time_idx on todos (start_time);
create index if not exists todos_remind_at_idx  on todos (remind_at) where reminded = false;

-- completed_at 자동 기록 트리거
create or replace function set_completed_at()
returns trigger as $$
begin
  if new.done = true and (old.done is distinct from true) then
    new.completed_at := now();
  elsif new.done = false then
    new.completed_at := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_completed_at on todos;
create trigger trg_set_completed_at
  before update on todos
  for each row execute function set_completed_at();
