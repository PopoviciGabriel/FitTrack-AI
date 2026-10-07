import { RestTimerState } from "../types";

/**
 * App-wide rest timer store. Lives outside React so the countdown survives the workout editor
 * unmounting and tab changes; components subscribe through `useRestTimer`.
 * The countdown is derived from an absolute end time, so a throttled or backgrounded WebView
 * never makes it drift.
 */

export const DEFAULT_REST_SECONDS = 90;
export const REST_TIMER_PRESETS = [45, 60, 90, 120, 180] as const;

const REST_TIMER_END_KEY = "fittrack_rest_timer_target_end";
const REST_TIMER_TOTAL_KEY = "fittrack_rest_timer_total";
const TICK_MS = 250;

type Listener = () => void;

const IDLE_STATE: RestTimerState = {
  isActive: false,
  isRunning: false,
  isFinished: false,
  isMinimized: false,
  totalSeconds: DEFAULT_REST_SECONDS,
  remainingSeconds: DEFAULT_REST_SECONDS,
  endsAt: null,
};

const listeners = new Set<Listener>();
let tickHandle: ReturnType<typeof setInterval> | null = null;
let audioCtx: AudioContext | null = null;

const secondsUntil = (endsAt: number, now: number = Date.now()): number =>
  Math.max(0, Math.ceil((endsAt - now) / 1000));

const sanitizeSeconds = (seconds: number): number =>
  Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : DEFAULT_REST_SECONDS;

const persist = (s: RestTimerState): void => {
  try {
    if (s.isRunning && s.endsAt !== null) {
      localStorage.setItem(REST_TIMER_END_KEY, String(s.endsAt));
      localStorage.setItem(REST_TIMER_TOTAL_KEY, String(s.totalSeconds));
    } else {
      localStorage.removeItem(REST_TIMER_END_KEY);
    }
  } catch {
    // storage unavailable: the timer still works for this app session
  }
};

/** Resumes a countdown that was running when the app was closed or reloaded. */
const hydrate = (): RestTimerState => {
  try {
    const endsAt = parseInt(localStorage.getItem(REST_TIMER_END_KEY) ?? "", 10);
    if (!Number.isFinite(endsAt)) return IDLE_STATE;
    const remainingSeconds = secondsUntil(endsAt);
    if (remainingSeconds <= 0) {
      localStorage.removeItem(REST_TIMER_END_KEY);
      return IDLE_STATE;
    }
    const storedTotal = parseInt(localStorage.getItem(REST_TIMER_TOTAL_KEY) ?? "", 10);
    return {
      isActive: true,
      isRunning: true,
      isFinished: false,
      isMinimized: true,
      totalSeconds: Math.max(remainingSeconds, sanitizeSeconds(storedTotal)),
      remainingSeconds,
      endsAt,
    };
  } catch {
    return IDLE_STATE;
  }
};

let state: RestTimerState = typeof window === "undefined" ? IDLE_STATE : hydrate();

/** Creating/resuming the AudioContext inside a user gesture lets iOS play the end-of-rest beep later. */
const primeAudio = (): AudioContext | null => {
  try {
    if (typeof window === "undefined") return null;
    if (!audioCtx) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return null;
      audioCtx = new AudioCtor();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
};

const playFinishedAlert = (): void => {
  const ctx = primeAudio();
  if (ctx) {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio feedback not available:", e);
    }
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([250, 100, 250]);
  }
};

const syncTicker = (): void => {
  if (state.isRunning && tickHandle === null) {
    tickHandle = setInterval(tick, TICK_MS);
  } else if (!state.isRunning && tickHandle !== null) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
};

const setState = (next: RestTimerState): void => {
  const changed = (Object.keys(next) as (keyof RestTimerState)[]).some((k) => next[k] !== state[k]);
  if (!changed) return;
  const runningChanged = next.isRunning !== state.isRunning || next.endsAt !== state.endsAt;
  state = next;
  if (runningChanged) persist(state);
  syncTicker();
  listeners.forEach((l) => l());
};

function tick(): void {
  if (!state.isRunning || state.endsAt === null) return;
  const remainingSeconds = secondsUntil(state.endsAt);
  if (remainingSeconds <= 0) {
    setState({ ...state, isRunning: false, isFinished: true, remainingSeconds: 0, endsAt: null });
    playFinishedAlert();
    return;
  }
  if (remainingSeconds !== state.remainingSeconds) setState({ ...state, remainingSeconds });
}

if (typeof document !== "undefined") {
  const onForeground = () => {
    if (document.visibilityState === "visible") tick();
  };
  document.addEventListener("visibilitychange", onForeground);
  window.addEventListener("focus", onForeground);
}
syncTicker();

export function subscribeRestTimer(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRestTimerState(): RestTimerState {
  return state;
}

/** Fresh countdown from `seconds`, restarting any timer already on screen (e.g. after ticking a set). */
export function startRestTimer(seconds: number = DEFAULT_REST_SECONDS, options: { minimized?: boolean } = {}): void {
  primeAudio();
  const total = sanitizeSeconds(seconds);
  setState({
    isActive: true,
    isRunning: true,
    isFinished: false,
    isMinimized: options.minimized ?? state.isMinimized,
    totalSeconds: total,
    remainingSeconds: total,
    endsAt: Date.now() + total * 1000,
  });
}

/** Shows the full timer card; starts a countdown only when no timer is on screen yet. */
export function openRestTimer(seconds: number = DEFAULT_REST_SECONDS): void {
  if (state.isActive) {
    setState({ ...state, isMinimized: false });
    return;
  }
  startRestTimer(seconds, { minimized: false });
}

/** Switches to a preset duration and starts counting from it. */
export function setRestTimerPreset(seconds: number): void {
  startRestTimer(seconds);
}

export function toggleRestTimerRunning(): void {
  if (!state.isActive) return;
  primeAudio();
  if (state.isRunning && state.endsAt !== null) {
    setState({ ...state, isRunning: false, remainingSeconds: secondsUntil(state.endsAt), endsAt: null });
    return;
  }
  const seconds = state.remainingSeconds > 0 ? state.remainingSeconds : state.totalSeconds;
  setState({
    ...state,
    isRunning: true,
    isFinished: false,
    remainingSeconds: seconds,
    endsAt: Date.now() + seconds * 1000,
  });
}

/** Extends the rest; on a finished timer it starts counting the extra seconds. */
export function addRestTime(seconds: number): void {
  if (!state.isActive) return;
  const extra = sanitizeSeconds(seconds);
  const totalSeconds = state.totalSeconds + extra;
  if (state.isRunning && state.endsAt !== null) {
    const endsAt = state.endsAt + extra * 1000;
    setState({ ...state, totalSeconds, endsAt, remainingSeconds: secondsUntil(endsAt) });
    return;
  }
  if (state.isFinished) {
    primeAudio();
    setState({
      ...state,
      totalSeconds,
      isRunning: true,
      isFinished: false,
      remainingSeconds: extra,
      endsAt: Date.now() + extra * 1000,
    });
    return;
  }
  setState({ ...state, totalSeconds, remainingSeconds: state.remainingSeconds + extra });
}

/** Back to the full duration, paused. */
export function resetRestTimer(): void {
  if (!state.isActive) return;
  setState({ ...state, isRunning: false, isFinished: false, remainingSeconds: state.totalSeconds, endsAt: null });
}

/** Stops the countdown and removes the timer from the screen. */
export function stopRestTimer(): void {
  setState({ ...IDLE_STATE, totalSeconds: state.totalSeconds, remainingSeconds: state.totalSeconds });
}

export function setRestTimerMinimized(minimized: boolean): void {
  if (!state.isActive) return;
  setState({ ...state, isMinimized: minimized });
}
