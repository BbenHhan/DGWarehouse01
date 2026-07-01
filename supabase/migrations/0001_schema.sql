-- Progress Tracker Web Migration — core schema
-- See specs/001-progress-tracker-migration/data-model.md for the authoritative entity definitions.

create extension if not exists "pgcrypto";

-- Fixed lookup: physical rooms/areas (ห้องแรก, ห้องกลาง, ห้องซอย 1-4)
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_th text not null,
  emoji text not null,
  sort_order int not null
);

-- Fixed lookup: work-type tabs, shared across every room
create table if not exists work_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_th text not null,
  emoji text not null,
  sort_order int not null
);

-- Open-ended time bucket within a room + work-type combination
create table if not exists weeks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete restrict,
  work_type_id uuid not null references work_types (id) on delete restrict,
  week_number int not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (room_id, work_type_id, week_number)
);

create index if not exists weeks_room_work_type_idx on weeks (room_id, work_type_id);

-- Photos belong to exactly one week at a time
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks (id) on delete cascade,
  storage_path text not null,
  file_name text not null check (btrim(file_name) <> ''),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists photos_week_idx on photos (week_id);

-- Fixed lookup: the four หมวด document categories
create table if not exists document_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_th text not null,
  emoji text not null,
  sort_order int not null
);

-- Documents belong to exactly one หมวด category at a time
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references document_categories (id) on delete restrict,
  storage_path text not null,
  file_name text not null check (btrim(file_name) <> ''),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_category_idx on documents (category_id);

-- Keep updated_at current on rename/note/move (FR-006, FR-007, FR-008, FR-009)
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists photos_set_updated_at on photos;
create trigger photos_set_updated_at
  before update on photos
  for each row
  execute function set_updated_at();

drop trigger if exists documents_set_updated_at on documents;
create trigger documents_set_updated_at
  before update on documents
  for each row
  execute function set_updated_at();
