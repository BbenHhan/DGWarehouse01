/** @vitest-environment jsdom */
import "../vitest.setup.dom";

import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentCategory } from "@/lib/types";

// specs/045-automate-manual-checks US3. Both behaviours here were on the manual
// list: a person had to sign in, type a name, toggle management off and on, and
// watch what happened. Neither needs a browser to be true.
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/app/actions/document-taxonomy", () => ({
  createCategory: vi.fn(async () => ({ ok: true, data: null })),
  renameCategory: vi.fn(),
  moveCategory: vi.fn(),
  deleteCategory: vi.fn(),
  deleteGroup: vi.fn(),
}));

const { ManageModeProvider, ManageModeToggle } = await import("@/components/ManageModeProvider");
const { ReorderButtons } = await import("@/components/ReorderButtons");
const { CategoryManagePanel } = await import("@/components/CategoryManagePanel");

const CATEGORIES: DocumentCategory[] = [
  { id: "c1", slug: "structure", name_th: "หมวดที่ 1 โครงสร้างอาคาร", emoji: "🏗️", sort_order: 1 },
];

// FR-008 / FR-025. Leaving management mode unmounts the add field, so anything
// typed into it is gone unless the provider above it is holding the text.
describe("unsubmitted typing survives leaving management mode", () => {
  function renderPanel() {
    return render(
      <ManageModeProvider canManage>
        <ManageModeToggle />
        <CategoryManagePanel categories={CATEGORIES} documentCounts={{ c1: 0 }} allGroups={[]} />
      </ManageModeProvider>
    );
  }

  it("gives back the half-typed name when management mode is switched on again", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));
    await user.type(screen.getByPlaceholderText(/เพิ่มหมวดใหญ่/), "หมวดพิเศษ");

    await user.click(screen.getByRole("button", { name: /เสร็จสิ้น/ }));
    // The field really is gone, so this is not just a component that never unmounted.
    expect(screen.queryByPlaceholderText(/เพิ่มหมวดใหญ่/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));
    expect(screen.getByPlaceholderText(/เพิ่มหมวดใหญ่/)).toHaveValue("หมวดพิเศษ");
  });

  it("keeps the draft through several trips in and out", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));
    await user.type(screen.getByPlaceholderText(/เพิ่มหมวดใหญ่/), "หมวด");

    for (let round = 0; round < 3; round++) {
      await user.click(screen.getByRole("button", { name: /เสร็จสิ้น/ }));
      await user.click(screen.getByRole("button", { name: /จัดการหมวด/ }));
    }

    // Typing continues where it left off rather than starting over.
    await user.type(screen.getByPlaceholderText(/เพิ่มหมวดใหญ่/), "พิเศษ");
    expect(screen.getByPlaceholderText(/เพิ่มหมวดใหญ่/)).toHaveValue("หมวดพิเศษ");
  });
});

// FR-009 / FR-012. Reorder is a swap with a neighbour, so three quick taps are
// three swaps. The risk is two writes overlapping and the rows settling in an
// order nobody asked for — which only shows up under a burst, and never
// reliably by hand.
describe("a burst of reorder clicks settles in the order requested", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function renderButtons(onMove: (direction: "up" | "down") => Promise<{ ok: true } | { ok: false; error: string }>) {
    return render(
      <ManageModeProvider canManage>
        <ReorderButtons isFirst={false} isLast={false} label="กลุ่ม ก" onMove={onMove} />
      </ManageModeProvider>
    );
  }

  function click(direction: "up" | "down") {
    fireEvent.click(screen.getByRole("button", { name: `เลื่อน กลุ่ม ก ${direction === "up" ? "ขึ้น" : "ลง"}` }));
  }

  it("runs each write to completion before starting the next", async () => {
    const events: string[] = [];
    // The first write is the slowest. If these overlapped, the later, quicker
    // ones would finish first and the events would interleave.
    const durations = [100, 10, 40];
    let call = 0;
    const onMove = vi.fn(async (direction: "up" | "down") => {
      const duration = durations[call++];
      events.push(`start:${direction}`);
      await new Promise((resolve) => setTimeout(resolve, duration));
      events.push(`end:${direction}`);
      return { ok: true } as const;
    });

    renderButtons(onMove);
    click("down");
    click("up");
    click("down");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(onMove).toHaveBeenCalledTimes(3);
    expect(events).toEqual([
      "start:down",
      "end:down",
      "start:up",
      "end:up",
      "start:down",
      "end:down",
    ]);
  });

  it("does not collapse a burst into a single write", async () => {
    const onMove = vi.fn(async () => ({ ok: true }) as const);
    renderButtons(onMove);

    for (let i = 0; i < 4; i++) click("up");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Four taps means four swaps. Debouncing them into one would move the row a
    // single position while the screen had already shown four.
    expect(onMove).toHaveBeenCalledTimes(4);
  });

  it("keeps running the queue after one write fails", async () => {
    const onMove = vi
      .fn<(direction: "up" | "down") => Promise<{ ok: true } | { ok: false; error: string }>>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue({ ok: true });

    renderButtons(onMove);
    click("up");
    click("up");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // A rejected write must not leave everything queued behind it stranded.
    expect(onMove).toHaveBeenCalledTimes(2);
  });
});
