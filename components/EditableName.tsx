"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

// Click the name, type, click away. Used for both category and sub-group names
// (specs/040-editable-document-taxonomy FR-009).
//
// Editing in place rather than behind a pencil-and-dialog is deliberate: names
// are the most frequently corrected thing here, so the fastest possible path
// matters more than the extra safety a dialog would add — and a rename is
// trivially reversible by renaming back.
export function EditableName({
  value,
  onRename,
  className,
  ariaLabel,
}: {
  value: string;
  onRename: (nameTh: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  className?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // A rename that lands elsewhere (another tab, another person) arrives as a
  // new `value` prop; adopt it rather than showing a stale draft.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit() {
    const trimmed = draft.trim();
    // Clearing the field restores the previous name instead of saving a blank
    // one (FR-012). Nothing is sent, so an accidental select-all-delete costs
    // nothing.
    if (!trimmed) {
      setDraft(value);
      return;
    }
    if (trimmed === value) return;

    startTransition(async () => {
      const result = await onRename(trimmed);
      if (!result.ok) {
        toast.error(result.error);
        setDraft(value);
      }
    });
  }

  return (
    <input
      ref={inputRef}
      aria-label={ariaLabel}
      value={draft}
      disabled={isPending}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") inputRef.current?.blur();
        if (event.key === "Escape") {
          setDraft(value);
          inputRef.current?.blur();
        }
      }}
      className={[
        "min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5",
        "hover:border-border hover:bg-background focus:border-ring focus:bg-background focus:outline-none",
        "disabled:opacity-60",
        className ?? "",
      ].join(" ")}
    />
  );
}
