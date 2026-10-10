import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  X,
  BellRing,
  Timer as TimerIcon,
  Minimize2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useRestTimer } from "../lib/useRestTimer";
import {
  REST_TIMER_PRESETS,
  addRestTime,
  resetRestTimer,
  setRestTimerMinimized,
  setRestTimerPreset,
  stopRestTimer,
  toggleRestTimerRunning,
} from "../services/restTimerService";

interface RestTimerProps {
  /**
   * "editor": rendered inside the workout editor, above its footer but below its search sheet.
   * "screen": rendered over the regular tabs, above the navbar but below modals.
   */
  placement: "editor" | "screen";
}

const PRESET_LABELS: Record<(typeof REST_TIMER_PRESETS)[number], string> = {
  45: "45S",
  60: "1M",
  90: "1.5M",
  120: "2M",
  180: "3M",
};

const formatClock = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

export const RestTimer: React.FC<RestTimerProps> = ({ placement }) => {
  const { isActive, isRunning, isFinished, isMinimized, totalSeconds, remainingSeconds } = useRestTimer();

  const formatted = formatClock(remainingSeconds);
  const progressPercent =
    totalSeconds > 0 ? Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / totalSeconds) * 100)) : 0;
  const layerClass = placement === "editor" ? "z-[60]" : "z-[45]";
  const bottomClass =
    placement === "screen"
      ? "bottom-[calc(env(safe-area-inset-bottom)+5.75rem)]"
      : "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]";

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        isMinimized ? (
          /* Floating pill: keeps counting on every screen */
          <motion.div
            key="minimized-pill"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={cn("fixed left-4", bottomClass, layerClass)}
          >
            <div
              role="timer"
              aria-live="off"
              className={cn(
                "relative overflow-hidden flex items-center gap-1 pl-1.5 pr-1.5 py-1.5 rounded-full shadow-2xl border backdrop-blur-xl select-none",
                isFinished
                  ? "bg-green-600 text-white border-green-400 animate-pulse duration-1000 shadow-[0_0_25px_rgba(34,197,94,0.4)]"
                  : "bg-slate-900/95 dark:bg-zinc-900/95 text-white border-slate-700/80 dark:border-white/10"
              )}
            >
              {!isFinished && (
                <div
                  className="absolute top-0 left-0 bottom-0 bg-blue-500/25 dark:bg-orange-500/25 pointer-events-none transition-[width] duration-300 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              )}

              <button
                type="button"
                onClick={() => setRestTimerMinimized(false)}
                className="relative flex items-center gap-2 h-10 pl-2.5 pr-3 rounded-full hover:bg-white/10 cursor-pointer transition-transform duration-150 active:scale-95"
                title="Extinde Timer"
                aria-label={`Timp de odihnă rămas ${formatted}. Extinde cronometrul`}
              >
                {isFinished ? (
                  <BellRing className="size-4 animate-bounce text-white" />
                ) : (
                  <TimerIcon className="size-4 text-blue-400 dark:text-orange-500" />
                )}
                <span className="font-mono tabular-nums font-black text-base tracking-tight">{formatted}</span>
              </button>

              <button
                type="button"
                onClick={() => addRestTime(30)}
                className="relative h-10 px-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-0.5 cursor-pointer transition-transform duration-150 active:scale-90"
                title="+30 secunde"
                aria-label="Adaugă 30 de secunde"
              >
                <Plus className="size-3" />
                <span>30s</span>
              </button>

              <button
                type="button"
                onClick={toggleRestTimerRunning}
                className="relative size-10 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white cursor-pointer transition-transform duration-150 active:scale-90"
                title={isRunning ? "Pauză" : "Start"}
                aria-label={isRunning ? "Pune pauză cronometrului" : "Pornește cronometrul"}
              >
                {isRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>

              <button
                type="button"
                onClick={stopRestTimer}
                className="relative size-10 flex items-center justify-center rounded-full hover:bg-red-500/25 text-zinc-300 hover:text-red-300 cursor-pointer transition-transform duration-150 active:scale-90"
                title="Oprește Timer"
                aria-label="Oprește cronometrul"
              >
                <X className="size-4" />
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
            className={cn("fixed left-4 right-4 max-w-md mx-auto", bottomClass, layerClass)}
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
                className="absolute top-0 left-0 bottom-0 bg-blue-500/15 dark:bg-orange-500/20 pointer-events-none transition-[width] duration-300 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />

              {/* Top-Right Absolute Control Action Buttons */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                <button
                  type="button"
                  onClick={() => setRestTimerMinimized(true)}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-transform duration-150 active:scale-90 cursor-pointer"
                  title="Minimizează în colț"
                  aria-label="Minimizează timer"
                >
                  <Minimize2 className="size-3.5" />
                </button>

                <button
                  type="button"
                  onClick={stopRestTimer}
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
                    type="button"
                    onClick={() => addRestTime(30)}
                    className="px-2.5 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-black uppercase tracking-wider flex items-center gap-0.5 cursor-pointer transition-transform duration-150 active:scale-90"
                    title="+30 secunde"
                  >
                    <Plus className="size-3" />
                    <span>30s</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleRestTimerRunning}
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
                    type="button"
                    onClick={resetRestTimer}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 cursor-pointer transition-transform duration-150 active:scale-90"
                    title="Resetează cronometrul"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                </div>
              </div>

              {/* Quick Presets: 45S, 1M, 1.5M, 2M, 3M */}
              <div className="relative flex items-center justify-between gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                {REST_TIMER_PRESETS.map((sec) => (
                  <button
                    type="button"
                    key={sec}
                    onClick={() => setRestTimerPreset(sec)}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-transform duration-150 active:scale-90 cursor-pointer ${
                      totalSeconds === sec
                        ? "bg-blue-600 text-white dark:bg-orange-500 dark:text-black shadow-sm"
                        : "bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {PRESET_LABELS[sec]}
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
