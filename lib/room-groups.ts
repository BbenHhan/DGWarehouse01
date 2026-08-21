import type { Room } from "@/lib/types";

// Presentational grouping only (no schema change) — mirrors the real v7
// folder layout, where ❄️ ห้องเย็น physically wraps ห้องย่อย 1-4. Shared by
// components/Sidebar.tsx and the room selectors on the bulk-upload page
// (components/RoomTabBar.tsx, components/MobileSwipeCard.tsx) so there's one
// definition of "which rooms belong under which box".
export type RoomGroup = { key: string; label: string; emoji: string; rooms: Room[] };

export function groupRooms(rooms: Room[]): RoomGroup[] {
  const coldRooms = rooms.filter((room) => room.slug.startsWith("hong-soi-"));
  const singleRooms = rooms.filter((room) => !room.slug.startsWith("hong-soi-"));
  const groups: RoomGroup[] = singleRooms.map((room) => ({
    key: room.id,
    label: room.name_th,
    emoji: room.emoji,
    rooms: [room],
  }));
  if (coldRooms.length > 0) {
    groups.push({ key: "cold", label: "ห้องเย็น", emoji: "❄️", rooms: coldRooms });
  }
  return groups;
}
