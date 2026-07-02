"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Images, FileText } from "lucide-react";

const NAV_ITEMS = [
  { href: "/photos", label: "รูปภาพ", icon: Images },
  { href: "/documents", label: "เอกสาร", icon: FileText },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 shadow-[0_1px_0_rgba(155,94,40,.1),0_2px_12px_rgba(0,0,0,.06)] backdrop-blur-xl supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/photos" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-primary-2 text-sm font-bold text-primary-foreground shadow-[0_4px_18px_rgba(155,94,40,.35)]">
            DG
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:inline">
            DG Warehouse 01
          </span>
        </Link>

        <nav className="flex gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                  active
                    ? "bg-gradient-to-br from-primary to-primary-2 text-primary-foreground shadow-[0_3px_14px_rgba(155,94,40,.35)]"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
