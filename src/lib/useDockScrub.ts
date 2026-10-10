import { RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Lifting the finger farther than this above or below the tabs cancels the switch (touch-up-outside). */
const CANCEL_DISTANCE_PX = 70;
/** When the pill's target jumps (touch-down, leaving or re-entering the dock) it glides there this long, then tracks 1:1. */
const CATCH_UP_MS = 160;

export interface DockScrubOptions {
  /** Element that receives the touches: the whole dock, padding included. */
  surfaceRef: RefObject<HTMLElement | null>;
  /** Row holding the tabs; its width is split evenly between them. */
  trackRef: RefObject<HTMLElement | null>;
  /**
   * Selection pill, one tab wide. The hook owns its inline transform (translateX in pill widths) and suspends its
   * CSS transition while a finger drives it, so the transition declared on the pill is only the snap to a tab.
   */
  pillRef: RefObject<HTMLElement | null>;
  count: number;
  /** Tab the pill rests on while no finger holds the dock; negative leaves the pill where it is. */
  restIndex: number;
  onSelect: (index: number) => void;
}

export interface DockScrubState {
  /** A finger is holding the dock. */
  pressed: boolean;
  /** Tab under the finger; null when not pressed or when the finger is too far from the dock. */
  index: number | null;
}

interface TouchReading {
  /** Finger position in tab units, clamped between the first and the last tab centre. */
  position: number;
  /** Nearest tab; null when the finger is too far above or below the tabs. */
  index: number | null;
}

const IDLE: DockScrubState = { pressed: false, index: null };

function readTouch(clientX: number, clientY: number, track: HTMLElement | null, count: number): TouchReading | null {
  if (!track || count <= 0) return null;
  const rect = track.getBoundingClientRect();
  if (rect.width <= 0) return null;
  const position = Math.min(Math.max(((clientX - rect.left) / rect.width) * count - 0.5, 0), count - 1);
  const inside = clientY >= rect.top - CANCEL_DISTANCE_PX && clientY <= rect.bottom + CANCEL_DISTANCE_PX;
  return { position, index: inside ? Math.round(position) : null };
}

const pillTransform = (position: number) => `translate3d(${position * 100}%, 0, 0)`;

/** Where the pill is on screen right now, in tab units; a snap still in flight included. */
function readPillPosition(pill: HTMLElement): number {
  const width = pill.getBoundingClientRect().width;
  const { transform } = getComputedStyle(pill);
  if (width <= 0 || !transform || transform === "none") return 0;
  return new DOMMatrixReadOnly(transform).m41 / width;
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * iOS tab bar scrubbing: holding the dock lifts the selection pill, which then follows the finger 1:1 across the
 * tabs; lifting the finger snaps it to the nearest tab and selects that tab. The pill is moved by writing its
 * transform once per frame, so a drag re-renders only when the tab under the finger changes.
 * Touch-only; mouse and keyboard keep using the buttons' click.
 */
export function useDockScrub({
  surfaceRef,
  trackRef,
  pillRef,
  count,
  restIndex,
  onSelect,
}: DockScrubOptions): DockScrubState {
  const [state, setState] = useState<DockScrubState>(IDLE);
  const latest = useRef({ count, restIndex, onSelect });
  const holding = useRef(false);

  useLayoutEffect(() => {
    latest.current = { count, restIndex, onSelect };
  });

  // Outside a gesture the pill follows the selected tab through its own CSS transition.
  useLayoutEffect(() => {
    const pill = pillRef.current;
    if (pill && !holding.current && restIndex >= 0) pill.style.transform = pillTransform(restIndex);
  }, [pillRef, restIndex]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    let frame = 0;
    let lastX = 0;
    let lastY = 0;
    let inside = true;
    let shown = 0;
    let glideFrom = 0;
    /** Start of the current catch-up glide; negative once the pill sits on its target. */
    let glideStart = -1;
    let committed = IDLE;

    const read = () => readTouch(lastX, lastY, trackRef.current, latest.current.count);

    const commit = (next: DockScrubState) => {
      if (next.pressed === committed.pressed && next.index === committed.index) return;
      committed = next;
      setState(next);
    };

    const place = (position: number) => {
      shown = position;
      const pill = pillRef.current;
      if (pill) pill.style.transform = pillTransform(position);
    };

    const startGlide = (now: number) => {
      glideFrom = shown;
      glideStart = now;
    };

    const step = (now: number) => {
      frame = 0;
      if (!holding.current) return;
      const reading = read();
      if (!reading) return;
      const nowInside = reading.index !== null;
      if (nowInside !== inside) {
        inside = nowInside;
        startGlide(now);
      }
      const rest = latest.current.restIndex;
      // Away from the dock the pill falls back to the selected tab: lifting the finger there cancels.
      const target = inside || rest < 0 ? reading.position : rest;
      const t = glideStart < 0 ? 1 : Math.min(Math.max((now - glideStart) / CATCH_UP_MS, 0), 1);
      if (t < 1) {
        place(glideFrom + (target - glideFrom) * easeOutCubic(t));
        frame = window.requestAnimationFrame(step);
      } else {
        glideStart = -1;
        place(target);
      }
      commit({ pressed: true, index: reading.index });
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(step);
    };

    const settle = (index: number) => {
      holding.current = false;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      glideStart = -1;
      // Dropping the inline override brings back the pill's own transition, which carries the snap.
      pillRef.current?.style.removeProperty("transition");
      if (index >= 0) place(index);
      commit(IDLE);
    };

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (e.touches.length !== 1 || !touch) {
        if (holding.current) settle(latest.current.restIndex);
        return;
      }
      holding.current = true;
      lastX = touch.clientX;
      lastY = touch.clientY;
      const reading = read();
      inside = reading?.index != null;
      const pill = pillRef.current;
      if (pill) {
        // Freeze the pill where it is on screen, mid-snap included, and drive it by hand from there.
        shown = readPillPosition(pill);
        pill.style.setProperty("transition", "none", "important");
        place(shown);
      }
      startGlide(performance.now());
      commit({ pressed: true, index: reading?.index ?? null });
      schedule();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!holding.current) return;
      const touch = e.touches[0];
      if (e.touches.length !== 1 || !touch) {
        settle(latest.current.restIndex);
        return;
      }
      // While the dock is being scrubbed the page underneath must not scroll.
      if (e.cancelable) e.preventDefault();
      lastX = touch.clientX;
      lastY = touch.clientY;
      schedule();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!holding.current) return;
      const touch = e.changedTouches[0];
      if (touch) {
        lastX = touch.clientX;
        lastY = touch.clientY;
      }
      const index = read()?.index ?? null;
      // The switch happens here; the click the browser would synthesize lands on the tab where the touch began.
      if (e.cancelable) e.preventDefault();
      settle(index ?? latest.current.restIndex);
      if (index !== null) latest.current.onSelect(index);
    };

    const onTouchCancel = () => {
      if (holding.current) settle(latest.current.restIndex);
    };

    surface.addEventListener("touchstart", onTouchStart, { passive: true });
    surface.addEventListener("touchmove", onTouchMove, { passive: false });
    surface.addEventListener("touchend", onTouchEnd, { passive: false });
    surface.addEventListener("touchcancel", onTouchCancel, { passive: true });
    return () => {
      surface.removeEventListener("touchstart", onTouchStart);
      surface.removeEventListener("touchmove", onTouchMove);
      surface.removeEventListener("touchend", onTouchEnd);
      surface.removeEventListener("touchcancel", onTouchCancel);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [surfaceRef, trackRef, pillRef]);

  return state;
}
