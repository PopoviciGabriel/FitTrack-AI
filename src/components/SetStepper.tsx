import React from "react";
import { Minus, Plus } from "lucide-react";

interface SetStepperProps {
  weight: number;
  reps: number;
  rpe?: number;
  onWeightChange: (val: number) => void;
  onRepsChange: (val: number) => void;
  onRpeChange?: (val: number) => void;
}

export const SetStepper: React.FC<SetStepperProps> = ({
  weight,
  reps,
  rpe,
  onWeightChange,
  onRepsChange,
  onRpeChange,
}) => {
  const adjustWeight = (delta: number) => {
    const next = Math.max(0, Math.round((weight + delta) * 10) / 10);
    onWeightChange(next);
  };

  const adjustReps = (delta: number) => {
    const next = Math.max(0, reps + delta);
    onRepsChange(next);
  };

  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        {/* Weight Stepper */}
        <div className="bg-slate-50 dark:bg-black/40 rounded-2xl p-3 border border-slate-200/80 dark:border-white/5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
              Greutate (kg)
            </span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => adjustWeight(-2.5)}
              className="size-11 rounded-xl bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 flex items-center justify-center font-black text-xs border border-slate-200 dark:border-white/5 active:scale-90 shadow-sm cursor-pointer"
              title="-2.5 kg"
            >
              -2.5
            </button>
            <button
              type="button"
              onClick={() => adjustWeight(-0.5)}
              className="size-11 rounded-xl bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 flex items-center justify-center font-black border border-slate-200 dark:border-white/5 active:scale-90 shadow-sm cursor-pointer"
            >
              <Minus className="size-4" />
            </button>

            <input
              type="number"
              step="0.5"
              value={weight === 0 ? "" : weight}
              placeholder="0"
              onChange={(e) => onWeightChange(parseFloat(e.target.value) || 0)}
              className="w-16 text-center py-2 text-lg font-black text-slate-900 dark:text-white bg-transparent focus:outline-none"
            />

            <button
              type="button"
              onClick={() => adjustWeight(0.5)}
              className="size-11 rounded-xl bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 flex items-center justify-center font-black border border-slate-200 dark:border-white/5 active:scale-90 shadow-sm cursor-pointer"
            >
              <Plus className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => adjustWeight(2.5)}
              className="size-11 rounded-xl bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 flex items-center justify-center font-black text-xs border border-slate-200 dark:border-white/5 active:scale-90 shadow-sm cursor-pointer"
              title="+2.5 kg"
            >
              +2.5
            </button>
          </div>
        </div>

        {/* Reps Stepper */}
        <div className="bg-slate-50 dark:bg-black/40 rounded-2xl p-3 border border-slate-200/80 dark:border-white/5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
              Repetări
            </span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => adjustReps(-2)}
              className="size-11 rounded-xl bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 flex items-center justify-center font-black text-xs border border-slate-200 dark:border-white/5 active:scale-90 shadow-sm cursor-pointer"
            >
              -2
            </button>
            <button
              type="button"
              onClick={() => adjustReps(-1)}
              className="size-11 rounded-xl bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 flex items-center justify-center font-black border border-slate-200 dark:border-white/5 active:scale-90 shadow-sm cursor-pointer"
            >
              <Minus className="size-4" />
            </button>

            <input
              type="number"
              value={reps === 0 ? "" : reps}
              placeholder="0"
              onChange={(e) => onRepsChange(parseInt(e.target.value, 10) || 0)}
              className="w-16 text-center py-2 text-lg font-black text-slate-900 dark:text-white bg-transparent focus:outline-none"
            />

            <button
              type="button"
              onClick={() => adjustReps(1)}
              className="size-11 rounded-xl bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 flex items-center justify-center font-black border border-slate-200 dark:border-white/5 active:scale-90 shadow-sm cursor-pointer"
            >
              <Plus className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => adjustReps(2)}
              className="size-11 rounded-xl bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 flex items-center justify-center font-black text-xs border border-slate-200 dark:border-white/5 active:scale-90 shadow-sm cursor-pointer"
            >
              +2
            </button>
          </div>
        </div>
      </div>

      {/* RPE Quick Pills */}
      {onRpeChange && (
        <div className="flex items-center justify-between gap-1 px-1 pt-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 shrink-0 mr-1">
            RPE:
          </span>
          {[6, 7, 8, 8.5, 9, 9.5, 10].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => onRpeChange(val)}
              className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                rpe === val
                  ? "bg-blue-600 text-white dark:bg-orange-500 dark:text-black shadow-sm"
                  : "bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              }`}
            >
              @{val}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
