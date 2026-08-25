-- specs/029-checklist-subitems: one level of sub-items under a checklist item.
alter table checklist_items
  add column if not exists parent_id uuid references checklist_items (id) on delete cascade;

create index if not exists checklist_items_parent_idx on checklist_items (parent_id);
