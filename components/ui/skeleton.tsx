import { cn } from "@/lib/utils";

// A placeholder block that breathes while a page's data is on its way.
//
// Skeletons rather than a spinner: the shapes are laid out like the page that
// is coming, so the layout does not jump when it arrives and the wait reads as
// "this is loading" instead of "something is happening somewhere".
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted-foreground/15", className)}
      {...props}
    />
  );
}

// Every loading screen announces itself the same way for anyone using a screen
// reader, since the skeletons themselves are decorative.
export function LoadingRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** The emoji-tile + title + subtitle block every content page opens with. */
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

/** The horizontally scrolling pill row used for categories, rooms, work types. */
export function TabBarSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden pb-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-9 w-40 shrink-0 rounded-full" />
      ))}
    </div>
  );
}

export function RowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}
