import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** Near the top of the page the state is always "expanded". */
const TOP_ZONE_PX = 30;
/** Scroll travel below this is jitter and does not count as a change of direction. */
const DIRECTION_THRESHOLD_PX = 6;
/** At least the dock pill's slide, so the dock never resizes under a moving pill. */
const HOLD_AFTER_CHANGE_MS = 400;

/**
 * True while the page is scrolled down past the top zone; false at the top and as soon as the user
 * scrolls back up. The window scroll is read at most once per animation frame.
 *
 * Changing `holdKey` (the active tab) swaps the page content, which can clamp the scroll offset without the
 * user scrolling; the state is held for a moment and re-evaluated once the hold ends.
 */
export function useCompactOnScroll(holdKey?: string): boolean {
  const [compact, setCompact] = useState(false);
  const holdUntil = useRef(0);

  // A layout effect, so the hold is armed before the browser reports the clamped scroll of the new content.
  useLayoutEffect(() => {
    holdUntil.current = performance.now() + HOLD_AFTER_CHANGE_MS;
  }, [holdKey]);

  useEffect(() => {
    let lastY = Math.max(0, window.scrollY);
    let frame = 0;
    let holdTimer = 0;

    const update = () => {
      frame = 0;
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      // iOS rubber-banding reports offsets outside [0, maxY]; the bounce back must not read as a direction change.
      const y = Math.min(Math.max(window.scrollY, 0), maxY);
      const holdLeft = holdUntil.current - performance.now();
      if (holdLeft > 0) {
        lastY = y;
        if (!holdTimer) {
          holdTimer = window.setTimeout(() => {
            holdTimer = 0;
            onScroll();
          }, holdLeft);
        }
        return;
      }
      if (y <= TOP_ZONE_PX) {
        lastY = y;
        setCompact(false);
        return;
      }
      const delta = y - lastY;
      if (Math.abs(delta) < DIRECTION_THRESHOLD_PX) return;
      lastY = y;
      setCompact(delta > 0);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      if (holdTimer) window.clearTimeout(holdTimer);
    };
  }, []);

  return compact;
}
