import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Plus, X, BellRing, Timer as TimerIcon } from "lucide-react";

interface RestTimerProps {
  initialSeconds?: number;
  isOpen: boolean;
  onClose: () => void;
  autoStart?: boolean;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  initialSeconds = 90,
  isOpen,
  onClose,
  autoStart = true,
}) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [totalTime, setTotalTime] = useState(initialSeconds);
  const [isFinished, setIsFinished] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play a beep sound using Web Audio API
  const playBeep = () => {
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
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {
      console.warn("Audio feedback not available:", e);
    }
  };

  useEffect(() => {
    setTimeLeft(initialSeconds);
    setTotalTime(initialSeconds);
    setIsRunning(autoStart);
    setIsFinished(false);
  }, [initialSeconds, autoStart, isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsFinished(true);
            playBeep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  const progressPercent = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  const setPreset = (sec: number) => {
    setTotalTime(sec);
    setTimeLeft(sec);
    setIsRunning(true);
    setIsFinished(false);
  };

  const addTime = (sec: number) => {
    setTimeLeft((prev) => prev + sec);
    setTotalTime((prev) => prev + sec);
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 max-w-md mx-auto animate-in slide-in-from-bottom-5 duration-300">
      <div
        className={`relative overflow-hidden rounded-[2rem] p-5 shadow-2xl border backdrop-blur-xl transition-all ${
          isFinished
            ? "bg-green-500 text-white border-green-400 dark:bg-green-600 animate-pulse"
            : "bg-white/95 dark:bg-zinc-900/95 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
        }`}
      >
        {/* Progress line indicator */}
        <div
          className="absolute top-0 left-0 bottom-0 bg-blue-500/10 dark:bg-orange-500/15 pointer-events-none transition-all duration-1000"
          style={{ width: `${progressPercent}%` }}
        />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl ${
                isFinished
                  ? "bg-white/20 text-white"
                  : "bg-blue-50 dark:bg-orange-500/20 text-blue-600 dark:text-orange-500"
              }`}
            >
              {isFinished ? <BellRing className="size-6 animate-bounce" /> : <TimerIcon className="size-6" />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                {isFinished ? "Pauză Încheiată!" : "Timp de Odihnă"}
              </p>
              <h3 className="text-3xl font-black tracking-tight leading-none">
                {formatted}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => addTime(30)}
              className="p-3 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-200 text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer active:scale-95"
              title="+30 secunde"
            >
              <Plus className="size-3.5" />
              <span>30s</span>
            </button>

            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`p-3.5 rounded-2xl text-white font-black shadow-lg cursor-pointer active:scale-95 transition-all ${
                isRunning
                  ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                  : "bg-blue-600 dark:bg-orange-500 hover:bg-blue-700 dark:hover:bg-orange-600 shadow-blue-600/30"
              }`}
            >
              {isRunning ? <Pause className="size-5" /> : <Play className="size-5" />}
            </button>

            <button
              onClick={() => {
                setTimeLeft(totalTime);
                setIsRunning(false);
                setIsFinished(false);
              }}
              className="p-3 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-500 dark:text-zinc-400 cursor-pointer active:scale-95"
              title="Resetează"
            >
              <RotateCcw className="size-4" />
            </button>

            <button
              onClick={onClose}
              className="p-3 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="relative flex items-center justify-between gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
          {[45, 60, 90, 120, 180].map((sec) => (
            <button
              key={sec}
              onClick={() => setPreset(sec)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                totalTime === sec
                  ? "bg-blue-600 text-white dark:bg-orange-500 dark:text-black shadow-sm"
                  : "bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
            >
              {sec < 60 ? `${sec}s` : `${sec / 60}m`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
