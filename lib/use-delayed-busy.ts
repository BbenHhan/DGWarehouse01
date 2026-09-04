"use client";

import { useEffect, useRef, useState } from "react";

// How long a wait must last before its indicator appears. Below this, the
// action is over quickly enough that showing anything reads as a glitch
// rather than as feedback.
const APPEAR_AFTER_MS = 150;

// Once an indicator has appeared, how long it stays even if the work finishes
// immediately after. Without this floor, a wait of 160 ms would flash the
// indicator for 10 ms — exactly the blink the delay above exists to prevent.
const MIN_VISIBLE_MS = 400;

/**
 * Turns "is this work in flight" into "should the indicator be on screen".
 *
 * The two timers pull against each other and only reconcile in one place, so
 * they live here rather than in each of the eleven call sites. This governs
 * the indicator only — disabling the control happens immediately at the call
 * site, since a control that still accepts taps for 150 ms can produce two
 * writes from one intent.
 */
export function useDelayedBusy(active: boolean): boolean {
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => {
        shownAtRef.current = Date.now();
        setVisible(true);
      }, APPEAR_AFTER_MS);
      return () => clearTimeout(timer);
    }

    // Never became visible — the wait ended inside the delay.
    if (shownAtRef.current === null) {
      setVisible(false);
      return;
    }

    const remaining = MIN_VISIBLE_MS - (Date.now() - shownAtRef.current);
    if (remaining <= 0) {
      shownAtRef.current = null;
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      shownAtRef.current = null;
      setVisible(false);
    }, remaining);
    return () => clearTimeout(timer);
  }, [active]);

  return visible;
}
