-- Fixed lookup data — the 6 rooms, 6 work types, and 4 document categories from v7.
-- Idempotent: safe to re-run (conflict on slug is a no-op).

insert into rooms (slug, name_th, emoji, sort_order) values
  ('hong-raek', 'ห้องแรก', '🏠', 1),
  ('hong-klang', 'ห้องกลาง', '🏢', 2),
  ('hong-soi-1', 'ห้องซอย 1', '❄️', 3),
  ('hong-soi-2', 'ห้องซอย 2', '❄️', 4),
  ('hong-soi-3', 'ห้องซอย 3', '❄️', 5),
  ('hong-soi-4', 'ห้องซอย 4', '❄️', 6)
on conflict (slug) do nothing;

insert into work_types (slug, name_th, emoji, sort_order) values
  ('firewalls', 'งานผนังและกำแพงกันไฟ', '🧱', 1),
  ('electrical', 'งานไฟฟ้าและสายล่อฟ้า', '⚡', 2),
  ('roofing', 'งานหลังคาและระบายอากาศ', '🏠', 3),
  ('flooring', 'งานพื้น', '🏗️', 4),
  ('drainage', 'บ่อพัก/รางน้ำ', '🌊', 5),
  ('overview', 'ภาพรวมทั่วไป', '📷', 6)
on conflict (slug) do nothing;

insert into document_categories (slug, name_th, emoji, sort_order) values
  ('structure', 'หมวดที่ 1 โครงสร้างอาคาร', '🏗️', 1),
  ('electrical', 'หมวดที่ 2 ระบบไฟฟ้า', '⚡', 2),
  ('environment', 'หมวดที่ 3 สิ่งแวดล้อม', '🌿', 3),
  ('safety', 'หมวดที่ 4 ความปลอดภัย', '🦺', 4)
on conflict (slug) do nothing;
