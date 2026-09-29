import React, { useState, useEffect } from "react";
import { Check, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";
import { Set } from "../types";

export interface SetRowProps {
  setIndex: number;
  set: Set;
  isPR?: boolean;
  est1RM?: number;
  onUpdate: (updates: Partial<Set>) => void;
  onToggleComplete: () => void;
  onDeleteSet?: () => void;
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

export const SetRow: React.FC<SetRowProps> = ({
  setIndex,
  set,
  isPR = false,
  est1RM,
  onUpdate,
  onToggleComplete,
  onDeleteSet,
}) => {
  const [showRpeMenu, setShowRpeMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-reset delete icon back to number after 3 seconds if not confirmed
  useEffect(() => {
    if (!isDeleting) return;
    const timer = setTimeout(() => {
      setIsDeleting(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isDeleting]);

  const currentRpe = set.rpe;
  const currentRpeOption = RPE_OPTIONS.find((opt) => opt.value === currentRpe);

  const handleSetNumberClick = () => {
    if (!onDeleteSet) return;

    if (isDeleting) {
      // Second click on the Trash2 icon confirms delete
      onDeleteSet();
      setIsDeleting(false);
    } else {
      // First click morphs number into Trash2
      setIsDeleting(true);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl transition-all border",
        set.completed
          ? "bg-emerald-500/[0.07] dark:bg-emerald-500/[0.08] border-emerald-500/30"
          : isPR
          ? "bg-amber-500/[0.06] border-amber-500/30"
          : "bg-slate-50/70 dark:bg-white/[0.02] border-slate-200/70 dark:border-white/5"
      )}
    >
      {/* 5-Column Grid Layout: Set | KG | Reps | RPE | ✓ */}
      <div className="grid grid-cols-[1.1fr_2.5fr_2.5fr_1.8fr_1.3fr] items-center gap-1.5 sm:gap-2 px-2 py-2">
        {/* Col 1: SET (Interactive number that morphs into red Trash2 icon on click) */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={handleSetNumberClick}
            className={cn(
              "size-8 rounded-lg flex items-center justify-center font-black text-xs transition-all cursor-pointer select-none relative active:scale-90",
              isDeleting
                ? "bg-red-500 text-white shadow-xs animate-in fade-in zoom-in-90 duration-150 ring-2 ring-red-500/30"
                : set.completed
                ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black font-black"
                : "bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-300 dark:hover:bg-white/15"
            )}
            title={
              isDeleting
                ? "Apasă din nou pentru a șterge seria"
                : "Apasă pentru a șterge seria"
            }
          >
            {isDeleting ? (
              <Trash2 className="size-4 text-white animate-pulse" />
            ) : (
              <span className="transition-opacity duration-150">
                {setIndex + 1}
              </span>
            )}
          </button>
        </div>

        {/* Col 2: Greutate (KG) - Clean touch-friendly number input */}
        <div className="flex items-center justify-center">
          <input
            type="number"
            inputMode="decimal"
            pattern="[0-9]*"
            step="any"
            min="0"
            value={set.weight === 0 ? "" : set.weight}
            placeholder="0"
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onUpdate({ weight: isNaN(val) ? 0 : Math.max(0, val) });
            }}
            className={cn(
              "w-full h-10 px-1 rounded-lg text-center font-black text-sm sm:text-base border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-orange-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              set.completed
                ? "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-950 dark:text-emerald-300 border-emerald-500/30"
                : "bg-white dark:bg-black/40 text-slate-900 dark:text-white border-slate-200 dark:border-white/10"
            )}
          />
        </div>

        {/* Col 3: Repetări (REPS) - Clean touch-friendly integer input */}
        <div className="flex items-center justify-center">
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            step="1"
            min="0"
            value={set.reps === 0 ? "" : set.reps}
            placeholder="0"
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              onUpdate({ reps: isNaN(parsed) ? 0 : Math.max(0, parsed) });
            }}
            className={cn(
              "w-full h-10 px-1 rounded-lg text-center font-black text-sm sm:text-base border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-orange-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              set.completed
                ? "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-950 dark:text-emerald-300 border-emerald-500/30"
                : "bg-white dark:bg-black/40 text-slate-900 dark:text-white border-slate-200 dark:border-white/10"
            )}
          />
        </div>

        {/* Col 4: RPE - Discrete & Compact Pill Button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => setShowRpeMenu((prev) => !prev)}
            className={cn(
              "w-full h-10 px-1 rounded-lg text-[11px] font-black flex items-center justify-center gap-0.5 border transition-all cursor-pointer",
              currentRpe
                ? "bg-slate-900 text-white dark:bg-zinc-800 dark:text-orange-400 border-slate-700 dark:border-white/10 shadow-2xs"
                : "bg-white dark:bg-black/40 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-white/10 hover:border-slate-300"
            )}
            title="Alege RPE / RIR"
          >
            <span>{currentRpe ? `@${currentRpe}` : "-"}</span>
            <ChevronDown
              className={cn(
                "size-3 opacity-60 transition-transform duration-200 shrink-0",
                showRpeMenu && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Col 5: DONE Checkbox (Ergonomic Check Button) */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onToggleComplete}
            className={cn(
              "size-10 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-90 border shadow-2xs",
              set.completed
                ? "bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-500 dark:border-emerald-400"
                : "bg-white dark:bg-black/40 text-slate-300 dark:text-zinc-700 border-slate-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-orange-500/40"
            )}
            title={set.completed ? "Serie bifată" : "Bifează seria ca finalizată"}
          >
            <Check
              className={cn(
                "size-5 transition-transform",
                set.completed ? "scale-100 stroke-[3]" : "scale-75 stroke-[2] opacity-30"
              )}
            />
          </button>
        </div>
      </div>

      {/* RPE Retractable Selector Panel */}
      {showRpeMenu && (
        <div className="px-3 pb-3 pt-2 border-t border-slate-200/60 dark:border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Efort perceput (RPE / RIR)
            </span>
            {currentRpeOption && (
              <span className="text-[10px] font-bold text-blue-600 dark:text-orange-400">
                {currentRpeOption.desc}
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-9 gap-1">
            {RPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onUpdate({ rpe: opt.value });
                  setShowRpeMenu(false);
                }}
                className={cn(
                  "py-1.5 px-0.5 rounded-lg text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center border",
                  currentRpe === opt.value
                    ? "bg-blue-600 text-white dark:bg-orange-500 dark:text-black border-transparent shadow-xs"
                    : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-zinc-800"
                )}
              >
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PR Badge & Estimation Row */}
      {isPR && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-amber-500/20 bg-amber-500/[0.04] rounded-b-xl">
          <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
            🏆 Record Personal Estimat
          </span>
          {est1RM && (
            <span className="text-[10px] font-mono font-black text-slate-900 dark:text-white">
              ~{est1RM} kg 1RM
            </span>
          )}
        </div>
      )}
    </div>
  );
};
