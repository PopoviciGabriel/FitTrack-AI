import React, { useState, useEffect, useRef } from "react";
import { X, Scale, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WeightInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (weight: number) => void;
  currentWeight?: number | null;
}

export const WeightInputModal: React.FC<WeightInputModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentWeight,
}) => {
  const [val, setVal] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setVal(currentWeight ? String(currentWeight) : "");
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, currentWeight]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanVal = val.replace(",", ".");
    const parsed = parseFloat(cleanVal);
    if (!isNaN(parsed) && parsed > 0 && parsed < 400) {
      onSave(parsed);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden p-6 z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                  <Scale className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white uppercase tracking-tight leading-none">
                    Înregistrează Greutate
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mt-1">
                    Actualizează greutatea corporală
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-white transition-colors cursor-pointer"
                title="Închide"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Large Centered Clean Input */}
              <div className="my-6 py-4 px-6 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/70 focus-within:border-orange-500 dark:focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all flex items-center justify-center gap-2">
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="ex: 78.5"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  className="text-4xl font-black text-center text-slate-950 dark:text-white bg-transparent outline-none w-full placeholder:text-slate-300 dark:placeholder:text-zinc-600 font-mono tabular-nums tracking-tight"
                />
                <span className="text-base font-black uppercase text-slate-400 dark:text-zinc-500 select-none">
                  kg
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-black text-xs uppercase tracking-wider transition-all duration-200 ease-out active:scale-95 cursor-pointer text-center"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={!val || isNaN(parseFloat(val.replace(",", "."))) || parseFloat(val.replace(",", ".")) <= 0}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white dark:text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 transition-all duration-200 ease-out active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Check className="size-4 stroke-[3]" />
                  <span>Salvează</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
