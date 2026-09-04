import { Loader2 } from "lucide-react";

// The in-flight marker for a button that is waiting on a Server Action.
// Constitution V asks every async action to show an explicit loading state;
// the buttons already changed their words, and this makes the wait visible at
// a glance rather than only on reading.
export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden="true" className={["h-4 w-4 animate-spin", className ?? ""].join(" ")} />;
}
