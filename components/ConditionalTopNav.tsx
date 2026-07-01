"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/TopNav";

const HIDDEN_PREFIXES = ["/login", "/auth"];

export function ConditionalTopNav() {
  const pathname = usePathname();
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }
  return <TopNav />;
}
