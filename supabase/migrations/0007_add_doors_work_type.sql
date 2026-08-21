-- Adds the "doors" work-type category — specs/014-bulk-photo-import. The
-- real progress-photo folder tree has always had a "Doors & Exits" category
-- with real photos in it (already surfaced read-only by lib/mock/source.ts's
-- legacy view), but the original 6-category seed in 0004_seed_lookups.sql
-- never included it. Idempotent: safe to re-run (conflict on slug is a no-op).

insert into work_types (slug, name_th, emoji, sort_order) values
  ('doors', 'งานประตูและทางออกฉุกเฉิน', '🚪', 7)
on conflict (slug) do nothing;
