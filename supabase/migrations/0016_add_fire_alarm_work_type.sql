-- Adds a work-type category for fire alarm system progress photos: detectors,
-- manual pull stations, the control panel and their wiring. Until now these had
-- no home and landed in "ภาพรวมทั่วไป" or "งานไฟฟ้าและสายล่อฟ้า", which made
-- them hard to pull together as evidence alongside the Fire Alarm System Test
-- report. Same shape as 0007_add_doors_work_type.sql. Idempotent: safe to re-run
-- (conflict on slug is a no-op).

insert into work_types (slug, name_th, emoji, sort_order) values
  ('fire-alarm', 'งานระบบแจ้งเหตุเพลิงไหม้', '🚨', 8)
on conflict (slug) do nothing;
