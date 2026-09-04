/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDelayedBusy } from "@/lib/use-delayed-busy";

// Fake timers throughout: this hook is two timers and nothing else, and a
// real-clock test of it would be exactly the kind of flake that showed up in
// the previous feature.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDelayedBusy", () => {
  it("stays hidden while nothing is in flight", () => {
    const { result } = renderHook(() => useDelayedBusy(false));
    expect(result.current).toBe(false);
  });

  it("stays hidden for a wait that ends inside the delay", () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedBusy(active), {
      initialProps: { active: true },
    });

    act(() => void vi.advanceTimersByTime(100));
    expect(result.current).toBe(false);

    rerender({ active: false });
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current).toBe(false);
  });

  it("appears once the wait passes the delay", () => {
    const { result } = renderHook(() => useDelayedBusy(true));

    act(() => void vi.advanceTimersByTime(149));
    expect(result.current).toBe(false);

    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it("stays visible long enough to read when the work ends right after it appears", () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedBusy(active), {
      initialProps: { active: true },
    });

    act(() => void vi.advanceTimersByTime(150));
    expect(result.current).toBe(true);

    // Finishes 10ms after appearing — without the floor this would be a blink.
    act(() => void vi.advanceTimersByTime(10));
    rerender({ active: false });
    expect(result.current).toBe(true);

    act(() => void vi.advanceTimersByTime(389));
    expect(result.current).toBe(true);

    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });

  it("hides immediately when the floor has already elapsed", () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedBusy(active), {
      initialProps: { active: true },
    });

    act(() => void vi.advanceTimersByTime(150));
    act(() => void vi.advanceTimersByTime(500));
    rerender({ active: false });
    expect(result.current).toBe(false);
  });

  it("does not update state after unmounting mid-wait", () => {
    const { unmount } = renderHook(() => useDelayedBusy(true));
    unmount();
    expect(() => act(() => void vi.advanceTimersByTime(2000))).not.toThrow();
  });
});
