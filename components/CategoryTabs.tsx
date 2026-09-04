"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { categoryNumber } from "@/lib/taxonomy-label";
import { Spinner } from "@/components/ui/spinner";
import { useDelayedBusy } from "@/lib/use-delayed-busy";
import type { DocumentCategory } from "@/lib/types";

// Each category is its own route, so switching tabs is a navigation with a
// server round trip behind it. Without a per-tab signal the only feedback is
// the page content swapping some moments later, which reads as a dead click on
// a slow connection.
function TabPending() {
  const { pending } = useLinkStatus();
  // Same rule as every other indicator: a warm client navigation can finish
  // inside the delay, and a spinner that flashes reads as a glitch.
  const showBusy = useDelayedBusy(pending);
  return showBusy ? <Spinner className="h-3.5 w-3.5" /> : null;
}

export function CategoryTabs({
  categories,
  activeSlug,
}: {
  categories: DocumentCategory[];
  activeSlug: string;
}) {
  return (
    <nav className="scroll-thin flex gap-2 overflow-x-auto pb-2">
      {categories.map((category) => {
        const active = category.slug === activeSlug;
        return (
          <Link
            key={category.id}
            href={`/documents/${category.slug}`}
            aria-current={active ? "page" : undefined}
            className={[
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
              active
                ? "border-transparent bg-gradient-to-br from-primary to-primary-2 text-primary-foreground shadow-[0_3px_14px_rgba(155,94,40,.35)]"
                : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
            ].join(" ")}
          >
            <span className="text-base leading-none">{category.emoji}</span>
            {categoryNumber(category)} {category.name_th}
            <TabPending />
          </Link>
        );
      })}
    </nav>
  );
}
