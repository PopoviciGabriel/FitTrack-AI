import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

interface SetStepperProps {
  weight: number;
  reps: number;
  rpe?: number;
  onWeightChange: (val: number) => void;
  onRepsChange: (val: number) => void;
  onRpeChange?: (val: number) => void;
}

const RPE_OPTIONS = [
  { value: 6, label: "@6", desc: "4+ reps în rezervă (Ușor)" },
  { value: 6.5, label: "@6.5", desc: "3-4 reps în rezervă" },
  { value: 7, label: "@7", desc: "3 reps în rezervă (Moderat)" },
  { value: 7.5, label: "@7.5", desc: "2-3 reps în rezervă" },
  { value: 8, label: "@8", desc: "2 reps în rezervă (Optim)" },
  { value: 8.5, label: "@8.5", desc: "1-2 reps în rezervă" },
  { value: 9, label: "@9", desc: "1 rep în rezervă (Greu)" },
  { value: 9.5, label: "@9.5", desc: "0-1 reps (Aproape de eșec)" },
  { value: 10, label: "@10", desc: "Eșec muscular (0 reps)" },
];

export const SetStepper: React.FC<SetStepperProps> = ({
  weight,
  reps,
  rpe,
  onWeightChange,
  onRepsChange,
  onRpeChange,
}) => {
  const [showRpeSelector, setShowRpeSelector] = useState(false);
  const currentRpeOption = RPE_OPTIONS.find((opt) => opt.value === rpe);

  return (
    <div className="flex flex-col gap-2 py-1 w-full">
      <div className="grid grid-cols-2 gap-2">
        {/* Clean Weight Input */}
        <div className="bg-slate-50 dark:bg-black/40 rounded-xl p-2.5 border border-slate-200/80 dark:border-white/5 flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
            Greutate (kg)
          </span>
          <input
            type="number"
            inputMode="decimal"
            pattern="[0-9]*"
            step="any"
            min="0"
            value={weight === 0 ? "" : weight}
            placeholder="0"
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onWeightChange(isNaN(val) ? 0 : Math.max(0, val));
            }}
            className="w-full h-10 px-2 rounded-lg text-center font-black text-base bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Clean Reps Input */}
        <div className="bg-slate-50 dark:bg-black/40 rounded-xl p-2.5 border border-slate-200/80 dark:border-white/5 flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
            Repetări
          </span>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            step="1"
            min="0"
            value={reps === 0 ? "" : reps}
            placeholder="0"
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              onRepsChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
            }}
            className="w-full h-10 px-2 rounded-lg text-center font-black text-base bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* Discrete RPE Selector */}
      {onRpeChange && (
        <div className="border-t border-slate-200/60 dark:border-white/5 pt-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                RPE:
              </span>
              <button
                type="button"
                onClick={() => setShowRpeSelector((prev) => !prev)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 border transition-all cursor-pointer",
                  rpe
                    ? "bg-slate-900 text-white dark:bg-zinc-800 dark:text-orange-400 border-slate-700"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200"
                )}
              >
                <span>{rpe ? `@${rpe}` : "Alege RPE"}</span>
                <ChevronDown
                  className={cn(
                    "size-3 opacity-60 transition-transform",
                    showRpeSelector && "rotate-180"
                  )}
                />
              </button>
            </div>

            {currentRpeOption && (
              <span className="text-[10px] font-bold text-blue-600 dark:text-orange-400 truncate max-w-[170px] text-right">
                {currentRpeOption.desc}
              </span>
            )}
          </div>

          {showRpeSelector && (
            <div className="grid grid-cols-5 sm:grid-cols-9 gap-1 mt-2 p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 animate-in fade-in duration-150">
              {RPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onRpeChange(opt.value);
                    setShowRpeSelector(false);
                  }}
                  className={cn(
                    "py-1 rounded-lg text-xs font-black transition-all cursor-pointer",
                    rpe === opt.value
                      ? "bg-blue-600 text-white dark:bg-orange-500 dark:text-black shadow-xs"
                      : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
