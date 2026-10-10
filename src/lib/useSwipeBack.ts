import { RefObject, useEffect, useRef } from "react";

/** The touch must start this close to the left edge of the screen. */
const EDGE_START_PX = 35;
/** A release never goes back with less travel than this, however fast the flick. */
const MIN_SWIPE_X_PX = 75;
/** Vertical travel, before the drag starts, that turns the touch into a normal scroll. */
const MAX_DRIFT_Y_PX = 35;
/** Horizontal travel that turns an edge touch into a drag. */
const DRAG_LOCK_PX = 8;
/** Share of the screen width past which a slow release still goes back. */
const COMPLETE_RATIO = 0.35;
const FLICK_VELOCITY_PX_PER_MS = 0.45;
/** A finger that stopped for longer than this before lifting is not a flick. */
const FLICK_MAX_IDLE_MS = 100;
/** Dimming of the screen behind at the start of the drag; it fades to 0 as the screen slides away. */
const BACKDROP_MAX_OPACITY = 0.35;
const SETTLE_MS = 280;
const SETTLE_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
const SCREEN_SHADOW = "-10px 0 30px rgba(0, 0, 0, 0.28)";
/** After going back, a screen still on top this long later was not closed by onBack and is shown again. */
const RESTORE_CHECK_MS = 600;

export interface SwipeBackOptions {
  enabled?: boolean;
  /** Element that follows the finger. Without it the gesture only calls onBack on release. */
  screenRef?: RefObject<HTMLElement | null>;
  /**
   * Existing dimming layer to fade while dragging. It may contain the screen (a modal's overlay).
   * When omitted, a temporary dark layer is placed right behind the screen.
   */
  backdropRef?: RefObject<HTMLElement | null>;
}

interface BackHandler {
  current: {
    onBack: () => void;
    screenRef?: RefObject<HTMLElement | null>;
    backdropRef?: RefObject<HTMLElement | null>;
  };
}

interface DragTarget {
  handler: BackHandler;
  screen: HTMLElement | null;
  backdrop: HTMLElement | null;
  /** The backdrop was created for this drag and must be removed afterwards. */
  ownsBackdrop: boolean;
  /** Computed background of a backdrop that contains the screen, faded through color-mix. */
  backdropColor: string | null;
  backdropOpacity: number;
}

/** One entry per mounted screen that accepts the gesture; the last one is the screen on top. */
const backHandlers: BackHandler[] = [];

let phase: "idle" | "pending" | "dragging" | "settling" = "idle";
let startX = 0;
let startY = 0;
let lastX = 0;
let lastTime = 0;
let prevX = 0;
let prevTime = 0;
let drag: DragTarget | null = null;

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

function createBackdrop(screen: HTMLElement): HTMLElement {
  const backdrop = document.createElement("div");
  const zIndex = getComputedStyle(screen).zIndex;
  backdrop.setAttribute("aria-hidden", "true");
  Object.assign(backdrop.style, {
    position: "fixed",
    inset: "0",
    background: "#000",
    opacity: String(BACKDROP_MAX_OPACITY),
    pointerEvents: "none",
    zIndex: zIndex === "auto" ? "" : zIndex,
  });
  // Same stacking level and earlier in the DOM: painted right below the screen, above everything else.
  screen.parentElement?.insertBefore(backdrop, screen);
  return backdrop;
}

function beginDrag(handler: BackHandler): void {
  phase = "dragging";
  const screen = handler.current.screenRef?.current ?? null;
  if (!screen) {
    drag = { handler, screen: null, backdrop: null, ownsBackdrop: false, backdropColor: null, backdropOpacity: 0 };
    return;
  }

  const existing = handler.current.backdropRef?.current ?? null;
  const backdrop = existing ?? createBackdrop(screen);
  const backdropStyle = getComputedStyle(backdrop);
  drag = {
    handler,
    screen,
    backdrop,
    ownsBackdrop: existing === null,
    backdropColor: existing && existing.contains(screen) ? backdropStyle.backgroundColor : null,
    backdropOpacity: existing ? Number(backdropStyle.opacity) || 1 : BACKDROP_MAX_OPACITY,
  };

  screen.style.transition = "none";
  screen.style.willChange = "transform";
  screen.style.boxShadow = SCREEN_SHADOW;
  backdrop.style.transition = "none";
}

/** `remaining` goes from 1 (screen in place) to 0 (screen gone). */
function setBackdropLevel(target: DragTarget, remaining: number): void {
  const { backdrop } = target;
  if (!backdrop) return;
  if (target.backdropColor !== null) {
    // The overlay holds the screen itself: fade only its color, never the screen.
    backdrop.style.backgroundColor = `color-mix(in srgb, ${target.backdropColor} ${Math.round(remaining * 100)}%, transparent)`;
  } else {
    backdrop.style.opacity = String(target.backdropOpacity * remaining);
  }
}

function applyOffset(offsetX: number): void {
  if (!drag?.screen) return;
  drag.screen.style.transform = `translateX(${offsetX}px)`;
  setBackdropLevel(drag, 1 - Math.min(1, offsetX / window.innerWidth));
}

function clearScreenStyles(screen: HTMLElement): void {
  screen.style.transform = "";
  screen.style.transition = "";
  screen.style.willChange = "";
  screen.style.boxShadow = "";
  screen.style.visibility = "";
}

function releaseBackdrop(target: DragTarget): void {
  const { backdrop } = target;
  if (!backdrop) return;
  if (target.ownsBackdrop) {
    backdrop.remove();
    return;
  }
  backdrop.style.transition = "";
  backdrop.style.opacity = "";
  backdrop.style.backgroundColor = "";
  backdrop.style.visibility = "";
}

/** Slides the screen out (then calls onBack) or back into place, with the iOS settle curve. */
function settle(goBack: boolean): void {
  const target = drag;
  drag = null;
  if (!target) {
    phase = "idle";
    return;
  }

  const { screen, backdrop, handler } = target;
  if (!screen) {
    phase = "idle";
    if (goBack) handler.current.onBack();
    return;
  }

  phase = "settling";
  const transition = `${SETTLE_MS}ms ${SETTLE_EASING}`;
  screen.style.transition = `transform ${transition}`;
  screen.style.transform = goBack ? "translateX(100%)" : "translateX(0px)";
  if (backdrop) {
    backdrop.style.transition = `opacity ${transition}, background-color ${transition}`;
    setBackdropLevel(target, goBack ? 0 : 1);
  }

  window.setTimeout(() => {
    phase = "idle";
    if (!goBack) {
      clearScreenStyles(screen);
      releaseBackdrop(target);
      return;
    }
    // Hidden before onBack: an exit animation must not bring the screen back on screen first.
    screen.style.visibility = "hidden";
    if (backdrop && !target.ownsBackdrop) backdrop.style.visibility = "hidden";
    if (target.ownsBackdrop) backdrop?.remove();
    handler.current.onBack();
    window.setTimeout(() => {
      if (!screen.isConnected || !backHandlers.includes(handler)) return;
      clearScreenStyles(screen);
      releaseBackdrop(target);
    }, RESTORE_CHECK_MS);
  }, SETTLE_MS);
}

function onTouchStart(e: TouchEvent): void {
  if (phase === "settling" || phase === "dragging") return;
  const touch = e.touches[0];
  if (e.touches.length !== 1 || !touch || touch.clientX >= EDGE_START_PX || isInsideScrolledRow(e.target)) {
    phase = "idle";
    return;
  }
  phase = "pending";
  startX = prevX = lastX = touch.clientX;
  startY = touch.clientY;
  prevTime = lastTime = e.timeStamp;
}

function onTouchMove(e: TouchEvent): void {
  if (phase !== "pending" && phase !== "dragging") return;
  const touch = e.touches[0];
  if (e.touches.length > 1 || !touch) {
    if (phase === "dragging") settle(false);
    else phase = "idle";
    return;
  }

  const deltaX = touch.clientX - startX;
  const deltaY = touch.clientY - startY;
  if (phase === "pending") {
    if (Math.abs(deltaY) >= MAX_DRIFT_Y_PX || deltaX <= -DRAG_LOCK_PX) {
      phase = "idle";
      return;
    }
    if (deltaX < DRAG_LOCK_PX || Math.abs(deltaY) > deltaX) return;
    const handler = backHandlers[backHandlers.length - 1];
    if (!handler) {
      phase = "idle";
      return;
    }
    beginDrag(handler);
  }

  // Once the screen follows the finger, the page underneath must not scroll as well.
  if (e.cancelable) e.preventDefault();
  prevX = lastX;
  prevTime = lastTime;
  lastX = touch.clientX;
  lastTime = e.timeStamp;
  applyOffset(Math.max(0, deltaX));
}

function onTouchEnd(e: TouchEvent): void {
  if (phase === "pending") {
    phase = "idle";
    return;
  }
  if (phase !== "dragging") return;

  const endX = e.changedTouches[0]?.clientX ?? lastX;
  const deltaX = endX - startX;
  const elapsed = lastTime - prevTime;
  const idle = e.timeStamp - lastTime;
  const velocity = idle > FLICK_MAX_IDLE_MS ? 0 : elapsed > 0 ? (lastX - prevX) / elapsed : Number.POSITIVE_INFINITY;
  const goBack =
    deltaX > MIN_SWIPE_X_PX && (deltaX > window.innerWidth * COMPLETE_RATIO || velocity > FLICK_VELOCITY_PX_PER_MS);
  settle(goBack);
}

function onTouchCancel(): void {
  if (phase === "dragging") settle(false);
  else if (phase === "pending") phase = "idle";
}

function setListening(active: boolean): void {
  if (active) {
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
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
 * iOS-style interactive "swipe from the left edge to go back" for full-screen views and sheets, needed in a
 * home-screen PWA where Safari's own back gesture does not exist. The screen follows the finger, then slides
 * out (calling onBack) or springs back. It complements the visible back button and should call the same
 * handler. When several screens are stacked, only the top one reacts.
 */
export function useSwipeBack(onBack: () => void, options: SwipeBackOptions = {}): void {
  const { enabled = true, screenRef, backdropRef } = options;
  const handlerRef = useRef<BackHandler>({ current: { onBack, screenRef, backdropRef } });

  useEffect(() => {
    handlerRef.current.current = { onBack, screenRef, backdropRef };
  });

  useEffect(() => {
    if (!enabled) return;
    const handler = handlerRef.current;
    backHandlers.push(handler);
    if (backHandlers.length === 1) setListening(true);
    return () => {
      const index = backHandlers.indexOf(handler);
      if (index >= 0) backHandlers.splice(index, 1);
      if (drag?.handler === handler) {
        if (drag.screen) clearScreenStyles(drag.screen);
        releaseBackdrop(drag);
        drag = null;
        phase = "idle";
      }
      if (backHandlers.length === 0) setListening(false);
    };
  }, [enabled]);
}
