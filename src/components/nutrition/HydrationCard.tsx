import React, { useState } from "react";
import { Droplets, Plus, Minus, RotateCcw, Check, Sparkles } from "lucide-react";

interface HydrationCardProps {
  waterMl: number;
  targetWaterMl: number;
  onUpdateWater: (newAmount: number) => void;
}

export const HydrationCard: React.FC<HydrationCardProps> = ({
  waterMl,
  targetWaterMl,
  onUpdateWater,
}) => {
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const percentage = Math.min(Math.round((waterMl / (targetWaterMl || 3500)) * 100), 100);
  const isGoalReached = waterMl >= (targetWaterMl || 3500);

  const handleAdd = (amount: number) => {
    onUpdateWater(Math.max(0, waterMl + amount));
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customInput, 10);
    if (!isNaN(val) && val > 0) {
      handleAdd(val);
      setCustomInput("");
      setShowCustom(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-900/30 via-slate-900/90 to-cyan-950/40 dark:from-blue-950/40 dark:via-zinc-900/95 dark:to-cyan-950/30 border border-blue-500/20 dark:border-blue-500/10 p-5 backdrop-blur-xl shadow-xl transition-all">
      {/* Dynamic water fill effect */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-blue-500/10 pointer-events-none transition-all duration-700 ease-out"
        style={{ height: `${percentage}%` }}
      />

      <div className="relative flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 dark:text-blue-300 border border-blue-500/30">
            <Droplets className="size-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 dark:text-white tracking-tight">
                Tracker Hidratare & Apă
              </h3>
              {isGoalReached && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Check className="size-3" /> Țintă Atinsă
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {waterMl} ml / <span className="font-semibold text-slate-700 dark:text-zinc-300">{targetWaterMl} ml</span> zilnic
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black tracking-tight text-blue-500 dark:text-blue-400">
            {percentage}%
          </span>
          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-zinc-500">
            Progres
          </p>
        </div>
      </div>

      {/* Visual Water Level Bar */}
      <div className="relative w-full h-3 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-4 p-0.5">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500 shadow-sm shadow-blue-500/50"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Quick Add Buttons */}
      <div className="relative flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleAdd(250)}
          className="flex-1 min-w-[75px] py-2 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-300 text-xs font-black tracking-wider flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all"
        >
          <Plus className="size-3" />
          <span>250ml</span>
        </button>

        <button
          type="button"
          onClick={() => handleAdd(500)}
          className="flex-1 min-w-[75px] py-2 px-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-600 dark:text-blue-300 text-xs font-black tracking-wider flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all"
        >
          <Plus className="size-3" />
          <span>500ml</span>
        </button>

        <button
          type="button"
          onClick={() => handleAdd(750)}
          className="flex-1 min-w-[75px] py-2 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-600 dark:text-blue-300 text-xs font-black tracking-wider flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all"
        >
          <Plus className="size-3" />
          <span>750ml</span>
        </button>

        <button
          type="button"
          onClick={() => handleAdd(-250)}
          disabled={waterMl <= 0}
          className="py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 text-xs font-bold disabled:opacity-40 cursor-pointer active:scale-95 transition-all"
          title="-250ml"
        >
          <Minus className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onUpdateWater(0)}
          className="py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 text-xs font-bold cursor-pointer active:scale-95 transition-all"
          title="Resetează apa"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>

      {showCustom ? (
        <form onSubmit={handleCustomSubmit} className="mt-3 flex items-center gap-2">
          <input
            type="number"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Cantitate în ml (ex: 330)"
            className="flex-1 bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer"
          >
            Adaugă
          </button>
          <button
            type="button"
            onClick={() => setShowCustom(false)}
            className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            Anulează
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className="mt-2.5 text-[11px] text-blue-500 hover:text-blue-400 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Sparkles className="size-3" /> Cantitate personalizată în ml...
        </button>
      )}
    </div>
  );
};
