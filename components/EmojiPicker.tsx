"use client";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// A category's icon is the fastest way to tell one tab from another at a
// glance, so every category getting the same default folder made the tab bar
// harder to read than it needs to be
// (specs/040-editable-document-taxonomy follow-up).
//
// A fixed shortlist rather than a full emoji keyboard: these are the subjects a
// warehouse document category is ever about, and scrolling thousands of faces
// and flags to find a hard hat helps nobody.
export const CATEGORY_EMOJI = [
  "🏗️", "🧱", "🚪", "🪟", "🏠",
  "⚡", "💡", "🔌", "🔧", "⚙️",
  "🌿", "💧", "🧪", "♻️", "🌡️",
  "🦺", "🧯", "🔥", "⚠️", "🚨",
  "📑", "📋", "📐", "📊", "📁",
];

export function EmojiPicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (emoji: string) => void;
  ariaLabel: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" size="icon-sm" aria-label={ariaLabel}>
            <span className="text-base leading-none">{value}</span>
          </Button>
        }
      />
      <DropdownMenuContent className="w-auto">
        <div className="grid grid-cols-5 gap-0.5 p-1">
          {CATEGORY_EMOJI.map((emoji) => (
            <DropdownMenuItem
              key={emoji}
              onClick={() => onChange(emoji)}
              aria-label={emoji}
              className={[
                "flex h-8 w-8 items-center justify-center rounded-md p-0 text-base",
                emoji === value ? "bg-accent" : "",
              ].join(" ")}
            >
              {emoji}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
