"use client";

import { createContext, useContext, useRef, useState } from "react";
import { Check, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

// specs/040-editable-document-taxonomy.
//
// The documents page keeps its normal reading view by default; management
// controls only appear once someone who may edit switches this on (FR-018), and
// the rows they attach to never move (FR-019).
//
// State lives here, above everything it affects, for two reasons. The toggle
// sits in the page header while the controls it reveals are further down the
// page, so a shared owner is the only way to keep them in step without prop
// drilling through server components. And it is what makes FR-025 work: a name
// typed into an add field but not submitted is held here, so leaving management
// mode and coming back does not throw it away.
type ManageModeValue = {
  canManage: boolean;
  managing: boolean;
  setManaging: (managing: boolean) => void;
  /** Unsubmitted add-field text, keyed so each category keeps its own draft. */
  draft: (key: string) => string;
  setDraft: (key: string, value: string) => void;
  clearDraft: (key: string) => void;
  /**
   * Runs reorder writes strictly one after another.
   *
   * tasks.md called for debouncing rapid clicks into one write, which would be
   * wrong here: an arrow swaps with the neighbour, so three quick taps are three
   * swaps, and collapsing them into one would move the row a single position
   * while the screen showed three. Serializing instead sends every click but
   * never lets two overlap, so the order that settles is the order on screen —
   * which is what the spec's edge case actually asks for.
   */
  enqueue: (task: () => Promise<unknown>) => void;
};

const ManageModeContext = createContext<ManageModeValue | null>(null);

export function useManageMode(): ManageModeValue {
  const value = useContext(ManageModeContext);
  // Every consumer renders inside the provider the documents page installs.
  // Falling back to a disabled shape rather than throwing keeps DocList usable
  // anywhere else it might be rendered later.
  return (
    value ?? {
      canManage: false,
      managing: false,
      setManaging: () => {},
      draft: () => "",
      setDraft: () => {},
      clearDraft: () => {},
      enqueue: () => {},
    }
  );
}

export function ManageModeProvider({
  canManage,
  children,
}: {
  canManage: boolean;
  children: React.ReactNode;
}) {
  const [managing, setManaging] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  return (
    <ManageModeContext.Provider
      value={{
        canManage,
        managing: canManage && managing,
        setManaging,
        draft: (key) => drafts[key] ?? "",
        setDraft: (key, value) => setDrafts((current) => ({ ...current, [key]: value })),
        clearDraft: (key) => setDrafts((current) => ({ ...current, [key]: "" })),
        enqueue: (task) => {
          // A rejected task must not poison the chain for everything queued
          // behind it — each link swallows its own failure, and the task itself
          // is responsible for reporting it.
          queue.current = queue.current.then(task, task);
        },
      }}
    >
      {children}
    </ManageModeContext.Provider>
  );
}

// Sits in the page header. Hidden entirely from anyone who cannot edit —
// viewers see today's page exactly as it was (FR-016).
export function ManageModeToggle() {
  const { canManage, managing, setManaging } = useManageMode();
  if (!canManage) return null;

  return (
    <Button
      type="button"
      variant={managing ? "default" : "outline"}
      size="sm"
      onClick={() => setManaging(!managing)}
    >
      {managing ? <Check className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
      {managing ? "เสร็จสิ้น" : "จัดการหมวด"}
    </Button>
  );
}
