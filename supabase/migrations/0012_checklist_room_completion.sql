-- specs/031-checklist-room-completion: per-room completion state for a
-- checklist item tagged to more than one room. Supersedes specs/030's
-- (never-deployed) sub-item-per-room mechanism.
alter table checklist_item_rooms
  add column if not exists is_done boolean not null default false;
