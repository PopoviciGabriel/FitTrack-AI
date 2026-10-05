import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  X, 
  BellRing, 
  Timer as TimerIcon,
  Minimize2,
  Maximize2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RestTimerProps {
  initialSeconds?: number;
  isOpen: boolean;
  onClose: () => void;
  autoStart?: boolean;
  /** Changing this value restarts the countdown from `initialSeconds`, even if the timer is already open. */
  startSignal?: number;
}

const PRESETS = [
  { sec: 45, label: "45S" },
  { sec: 60, label: "1M" },
  { sec: 90, label: "1.5M" },
  { sec: 120, label: "2M" },
  { sec: 180, label: "3M" },
];

const REST_TIMER_END_KEY = "fittrack_rest_timer_target_end";
const REST_TIMER_TOTAL_KEY = "fittrack_rest_timer_total";

export const RestTimer: React.FC<RestTimerProps> = ({
  initialSeconds = 90,
  isOpen,
  onClose,
  autoStart = true,
  startSignal = 0,
}) => {
  const lastStartSignalRef = useRef(startSignal);
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [totalTime, setTotalTime] = useState(initialSeconds);
  const [isFinished, setIsFinished] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const targetEndTimeRef = useRef<number | null>(null);

  // Play a beep sound using Web Audio API and trigger device vibration
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);

      // Mobile vibration if supported
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([250, 100, 250]);
      }
    } catch (e) {
      console.warn("Audio feedback not available:", e);
    }
  }, []);

  const triggerFinished = useCallback(() => {
    setIsRunning(false);
    setIsFinished(true);
    setTimeLeft(0);
    targetEndTimeRef.current = null;
    try {
      localStorage.removeItem(REST_TIMER_END_KEY);
    } catch {
      // ignore
    }
    playBeep();
  }, [playBeep]);

  // Sync state on open or initialSeconds change
  useEffect(() => {
    if (!isOpen) return;

    const forceFreshStart = startSignal !== lastStartSignalRef.current;
    lastStartSignalRef.current = startSignal;

    if (!forceFreshStart) {
      try {
        const storedEndStr = localStorage.getItem(REST_TIMER_END_KEY);
        const storedTotalStr = localStorage.getItem(REST_TIMER_TOTAL_KEY);
        const now = Date.now();

        if (storedEndStr) {
          const storedTarget = parseInt(storedEndStr, 10);
          if (!isNaN(storedTarget)) {
            const remaining = Math.max(0, Math.round((storedTarget - now) / 1000));
            const total = storedTotalStr ? parseInt(storedTotalStr, 10) : initialSeconds;
            setTotalTime(total || initialSeconds);

            if (remaining > 0) {
              targetEndTimeRef.current = storedTarget;
              setTimeLeft(remaining);
              setIsRunning(true);
              setIsFinished(false);
              return;
            } else {
              // Already finished while closed
              targetEndTimeRef.current = null;
              localStorage.removeItem(REST_TIMER_END_KEY);
            }
          }
        }
      } catch {
        // ignore localStorage errors
      }
    }

    // Default fresh start
    if (autoStart) {
      const target = Date.now() + initialSeconds * 1000;
      targetEndTimeRef.current = target;
      try {
        localStorage.setItem(REST_TIMER_END_KEY, String(target));
        localStorage.setItem(REST_TIMER_TOTAL_KEY, String(initialSeconds));
      } catch {
        // ignore
      }
      setTimeLeft(initialSeconds);
      setTotalTime(initialSeconds);
      setIsRunning(true);
      setIsFinished(false);
    } else {
      targetEndTimeRef.current = null;
      setTimeLeft(initialSeconds);
      setTotalTime(initialSeconds);
      setIsRunning(false);
      setIsFinished(false);
    }
    setIsMinimized(false);
  }, [isOpen, initialSeconds, autoStart, startSignal]);

  // Precise interval tick based on targetEndTime (not naive decrement)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        const target = targetEndTimeRef.current;
        if (!target) return;
        const remaining = Math.max(0, Math.round((target - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          triggerFinished();
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, triggerFinished]);

  // Background recovery via visibilitychange and window focus
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        try {
          const storedEnd = localStorage.getItem(REST_TIMER_END_KEY);
          if (storedEnd) {
            const target = parseInt(storedEnd, 10);
            if (!isNaN(target)) {
              const remaining = Math.max(0, Math.round((target - Date.now()) / 1000));
              setTimeLeft(remaining);
              if (remaining <= 0) {
                triggerFinished();
              } else {
                targetEndTimeRef.current = target;
                setIsRunning(true);
                setIsFinished(false);
              }
            }
          }
        } catch {
          // ignore
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [triggerFinished]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  const progressPercent = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  const setPreset = (sec: number) => {
    const target = Date.now() + sec * 1000;
    targetEndTimeRef.current = target;
    try {
      localStorage.setItem(REST_TIMER_END_KEY, String(target));
      localStorage.setItem(REST_TIMER_TOTAL_KEY, String(sec));
    } catch {
      // ignore
    }
    setTotalTime(sec);
    setTimeLeft(sec);
    setIsRunning(true);
    setIsFinished(false);
  };

  const addTime = (sec: number) => {
    if (isRunning && targetEndTimeRef.current) {
      const newTarget = targetEndTimeRef.current + sec * 1000;
      targetEndTimeRef.current = newTarget;
      try {
        localStorage.setItem(REST_TIMER_END_KEY, String(newTarget));
      } catch {
        // ignore
      }
      setTimeLeft(Math.max(0, Math.round((newTarget - Date.now()) / 1000)));
    } else {
      setTimeLeft((prev) => prev + sec);
    }
    setTotalTime((prev) => {
      const nextTotal = prev + sec;
      try {
        localStorage.setItem(REST_TIMER_TOTAL_KEY, String(nextTotal));
      } catch {
        // ignore
      }
      return nextTotal;
    });
  };

  const toggleRunning = () => {
    if (isRunning) {
      // Pause
      const remaining = targetEndTimeRef.current 
        ? Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000))
        : timeLeft;
      setTimeLeft(remaining);
      setIsRunning(false);
      targetEndTimeRef.current = null;
      try {
        localStorage.removeItem(REST_TIMER_END_KEY);
      } catch {
        // ignore
      }
    } else {
      // Resume
      const secsToRun = timeLeft > 0 ? timeLeft : totalTime;
      const target = Date.now() + secsToRun * 1000;
      targetEndTimeRef.current = target;
      try {
        localStorage.setItem(REST_TIMER_END_KEY, String(target));
        localStorage.setItem(REST_TIMER_TOTAL_KEY, String(totalTime));
      } catch {
        // ignore
      }
      setTimeLeft(secsToRun);
      setIsRunning(true);
      setIsFinished(false);
    }
  };

  const resetTimer = () => {
    targetEndTimeRef.current = null;
    try {
      localStorage.removeItem(REST_TIMER_END_KEY);
    } catch {
      // ignore
    }
    setTimeLeft(totalTime);
    setIsRunning(false);
    setIsFinished(false);
  };

  const handleClose = () => {
    targetEndTimeRef.current = null;
    try {
      localStorage.removeItem(REST_TIMER_END_KEY);
    } catch {
      // ignore
    }
    setIsRunning(false);
    onClose();
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        isMinimized ? (
          /* Minimized Compact Floating Pill Badge */
          <motion.div
            key="minimized-pill"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-50"
          >
            <div
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-2xl border backdrop-blur-xl transition-all cursor-pointer select-none ${
                isFinished
                  ? "bg-green-600 text-white border-green-400 animate-pulse duration-1000 shadow-[0_0_25px_rgba(34,197,94,0.4)]"
                  : "bg-slate-900/95 dark:bg-zinc-900/95 text-white border-slate-700/80 dark:border-white/10"
              }`}
              onClick={() => setIsMinimized(false)}
            >
              <div className="flex items-center gap-2">
                {isFinished ? (
                  <BellRing className="size-4 animate-bounce text-white" />
                ) : (
                  <TimerIcon className="size-4 text-blue-400 dark:text-orange-500 animate-spin-slow" />
                )}
                <span className="font-mono tabular-nums font-black text-sm tracking-tight">{formatted}</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRunning();
                }}
                className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer transition-transform duration-150 active:scale-90"
                title={isRunning ? "Pauză" : "Start"}
              >
                {isRunning ? <Pause className="size-3" /> : <Play className="size-3" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(false);
                }}
                className="p-1 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer transition-transform duration-150 active:scale-90"
                title="Extinde Timer"
              >
                <Maximize2 className="size-3" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="p-1 rounded-full hover:bg-red-500/20 text-zinc-400 hover:text-red-400 cursor-pointer ml-0.5 transition-transform duration-150 active:scale-90"
                title="Închide"
              >
                <X className="size-3" />
              </button>
            </div>
          </motion.div>
        ) : (
          /* Expanded Full Card */
          <motion.div
            key="expanded-card"
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-4 right-4 z-50 max-w-md mx-auto"
          >
            <div
              className={`relative overflow-hidden rounded-[2.2rem] pt-7 pb-5 px-6 shadow-2xl border backdrop-blur-2xl transition-all ${
                isFinished
                  ? "bg-green-500 text-white border-green-400 dark:bg-green-600 animate-pulse duration-1000 shadow-[0_0_35px_rgba(34,197,94,0.45)]"
                  : "bg-white/95 dark:bg-zinc-950/95 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
              }`}
            >
              {/* Progress line indicator with linear continuous width transition */}
              <div
                className="absolute top-0 left-0 bottom-0 bg-blue-500/15 dark:bg-orange-500/20 pointer-events-none transition-[width] duration-500 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />

              {/* Top-Right Absolute Control Action Buttons */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-transform duration-150 active:scale-90 cursor-pointer"
                  title="Minimizează în colț"
                  aria-label="Minimizează timer"
                >
                  <Minimize2 className="size-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-red-100 dark:bg-zinc-800/80 dark:hover:bg-red-900/50 text-slate-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-300 transition-transform duration-150 active:scale-90 cursor-pointer"
                  title="Închide Timer"
                  aria-label="Închide cronometrul"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* Main Controls Header */}
              <div className="relative flex items-center justify-between gap-3 pr-14">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-2xl shrink-0 transition-colors ${
                      isFinished
                        ? "bg-white/20 text-white"
                        : "bg-blue-50 dark:bg-orange-500/20 text-blue-600 dark:text-orange-500"
                    }`}
                  >
                    {isFinished ? (
                      <BellRing className="size-6 animate-bounce text-white" />
                    ) : (
                      <TimerIcon className="size-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                      {isFinished ? "Pauză Încheiată!" : "Timp de Odihnă"}
                    </p>
                    <h3 className="text-3xl font-black font-mono tabular-nums tracking-tight leading-none">
                      {formatted}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => addTime(30)}
                    className="px-2.5 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-black uppercase tracking-wider flex items-center gap-0.5 cursor-pointer transition-transform duration-150 active:scale-90"
                    title="+30 secunde"
                  >
                    <Plus className="size-3" />
                    <span>30s</span>
                  </button>

                  <button
                    onClick={toggleRunning}
                    className={`p-3 rounded-xl text-white font-black shadow-lg cursor-pointer transition-transform duration-150 active:scale-90 ${
                      isRunning
                        ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                        : "bg-blue-600 dark:bg-orange-500 hover:bg-blue-700 dark:hover:bg-orange-600 shadow-blue-600/30"
                    }`}
                    title={isRunning ? "Pauză" : "Pornește"}
                  >
                    {isRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
                  </button>

                  <button
                    onClick={resetTimer}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 cursor-pointer transition-transform duration-150 active:scale-90"
                    title="Resetează cronometrul"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                </div>
              </div>

              {/* Quick Presets: 45S, 1M, 1.5M, 2M, 3M */}
              <div className="relative flex items-center justify-between gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                {PRESETS.map(({ sec, label }) => (
                  <button
                    key={sec}
                    onClick={() => setPreset(sec)}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-transform duration-150 active:scale-90 cursor-pointer ${
                      totalTime === sec
                        ? "bg-blue-600 text-white dark:bg-orange-500 dark:text-black shadow-sm"
                        : "bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )
      )}
    </AnimatePresence>
  );
};
