-- specs/032-checklist-detail-status-colors: replace the boolean is_done
-- (checklist_items from 0010; checklist_item_rooms from 0012) with a
-- three-state status, plus detail/start_date/due_date on checklist_items.
alter table checklist_items
  drop column if exists is_done,
  add column if not exists status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  add column if not exists detail text,
  add column if not exists start_date date,
  add column if not exists due_date date;

alter table checklist_item_rooms
  drop column if exists is_done,
  add column if not exists status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done'));
