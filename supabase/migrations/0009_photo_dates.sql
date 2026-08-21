-- Replace week date-range containers with a single date on each photo
-- (specs/018-per-photo-dates). No data to preserve: `weeks` and `photos` are
-- both confirmed empty live as of this migration (following the full data
-- reset earlier this session) — this is a clean schema replacement, not a
-- data migration.

alter table photos drop constraint if exists photos_week_id_fkey;
alter table photos drop column if exists week_id;

alter table photos add column if not exists room_id uuid references rooms (id) on delete restrict;
alter table photos add column if not exists work_type_id uuid references work_types (id) on delete restrict;
alter table photos add column if not exists date date;

alter table photos alter column room_id set not null;
alter table photos alter column work_type_id set not null;
alter table photos alter column date set not null;

create index if not exists photos_room_work_type_idx on photos (room_id, work_type_id);
create index if not exists photos_date_idx on photos (date);

-- Feature 016 (recurring period generator / cadence) only ever existed to
-- make picking a week date RANGE fast and overlap-free — both the range and
-- the conflict it prevented cease to exist once photos carry a single date.
drop table if exists week_cadences;
drop table if exists weeks;
