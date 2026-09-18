"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useDelayedBusy } from "@/lib/use-delayed-busy";

// specs/046-subgroup-requirement-checklist.
//
// EditableName's sibling for text that may legitimately be empty — a
// description, a note. EditableName restores the old value when cleared,
// because a sub-group cannot be nameless; here clearing is a real edit and
// saves as none (FR-012). Otherwise the same gesture: click, type, click away.
export function EditableText({
  value,
  onSave,
  placeholder,
  ariaLabel,
  className,
}: {
  value: string | null | undefined;
  onSave: (next: string | null) => Promise<{ ok: true } | { ok: false; error: string }>;
  placeholder: string;
  ariaLabel: string;
  className?: string;
}) {
  const stored = value ?? "";
  const [draft, setDraft] = useState(stored);
  const [isPending, startTransition] = useTransition();
  const showBusy = useDelayedBusy(isPending);
  const inputRef = useRef<HTMLInputElement>(null);

  // A save that lands elsewhere arrives as a new `value`; adopt it.
  useEffect(() => {
    setDraft(stored);
  }, [stored]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === stored) {
      setDraft(stored);
      return;
    }
    startTransition(async () => {
      const result = await onSave(trimmed.length > 0 ? trimmed : null);
      if (!result.ok) {
        toast.error(result.error);
        setDraft(stored);
      }
    });
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5" aria-busy={isPending || undefined}>
      <input
        ref={inputRef}
        aria-label={ariaLabel}
        value={draft}
        placeholder={placeholder}
        disabled={isPending}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") inputRef.current?.blur();
          if (event.key === "Escape") {
            setDraft(stored);
            inputRef.current?.blur();
          }
        }}
        className={[
          "min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5",
          "placeholder:text-muted-foreground/60 hover:border-border hover:bg-background",
          "focus:border-ring focus:bg-background focus:outline-none disabled:opacity-60",
          className ?? "",
        ].join(" ")}
      />
      {showBusy && <Spinner className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
    </span>
  );
}
