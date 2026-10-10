import { useEffect, useRef } from "react";

/** The touch must start this close to the left edge of the screen. */
const EDGE_START_PX = 35;
const MIN_SWIPE_X_PX = 75;
const MAX_DRIFT_Y_PX = 35;

/** One entry per mounted screen that accepts the gesture; the last one is the screen on top. */
const backHandlers: Array<{ current: () => void }> = [];
let gestureStart: { x: number; y: number } | null = null;

/** A row the user is scrolling back to its start must keep the swipe for itself. */
function isInsideScrolledRow(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body) {
    if (el.scrollLeft > 0 && el.scrollWidth > el.clientWidth) {
      const overflowX = getComputedStyle(el).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") return true;
    }
    el = el.parentElement;
  }
  return false;
}

function onTouchStart(e: TouchEvent): void {
  const touch = e.touches[0];
  gestureStart =
    e.touches.length === 1 && touch.clientX < EDGE_START_PX && !isInsideScrolledRow(e.target)
      ? { x: touch.clientX, y: touch.clientY }
      : null;
}

function onTouchMove(e: TouchEvent): void {
  if (!gestureStart) return;
  const touch = e.touches[0];
  if (e.touches.length > 1 || !touch || Math.abs(touch.clientY - gestureStart.y) >= MAX_DRIFT_Y_PX) {
    gestureStart = null;
  }
}

function onTouchEnd(e: TouchEvent): void {
  const start = gestureStart;
  gestureStart = null;
  const touch = e.changedTouches[0];
  if (!start || !touch) return;
  const deltaX = touch.clientX - start.x;
  const deltaY = touch.clientY - start.y;
  if (deltaX > MIN_SWIPE_X_PX && Math.abs(deltaY) < MAX_DRIFT_Y_PX) {
    backHandlers[backHandlers.length - 1]?.current();
  }
}

function onTouchCancel(): void {
  gestureStart = null;
}

function setListening(active: boolean): void {
  if (active) {
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { passive: true });
  } else {
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onTouchCancel);
  }
}

/**
 * iOS-style "swipe from the left edge to go back" for full-screen views and sheets, needed in a
 * home-screen PWA where Safari's own back gesture does not exist. It complements the visible back
 * button and should call the same handler. When several screens are stacked, only the top one reacts.
 */
export function useSwipeBack(onBack: () => void, enabled: boolean = true): void {
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    if (!enabled) return;
    const handler = { current: () => onBackRef.current() };
    backHandlers.push(handler);
    if (backHandlers.length === 1) setListening(true);
    return () => {
      const index = backHandlers.indexOf(handler);
      if (index >= 0) backHandlers.splice(index, 1);
      if (backHandlers.length === 0) {
        setListening(false);
        gestureStart = null;
      }
    };
  }, [enabled]);
}
