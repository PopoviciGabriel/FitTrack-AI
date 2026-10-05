import React, { useState, useEffect } from "react";
import {
  X,
  Zap,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Check,
  Plus
} from "lucide-react";
import { MacroMealItem, MealSlotCategory } from "../../types";

interface QuickMacroModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSlot: MealSlotCategory;
  onAddMealItem: (item: MacroMealItem) => void;
}

export const QuickMacroModal: React.FC<QuickMacroModalProps> = ({
  isOpen,
  onClose,
  targetSlot,
  onAddMealItem,
}) => {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState<string>("");
  const [protein, setProtein] = useState<string>("");
  const [carbs, setCarbs] = useState<string>("");
  const [fats, setFats] = useState<string>("");

  // Reset form when opened or slot changes
  useEffect(() => {
    if (isOpen) {
      setName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFats("");
    }
  }, [isOpen, targetSlot]);

  if (!isOpen) return null;

  // Auto calculate calories if user inputs macros and calories is empty
  const handleMacroChange = (
    field: "protein" | "carbs" | "fats",
    val: string
  ) => {
    if (field === "protein") setProtein(val);
    if (field === "carbs") setCarbs(val);
    if (field === "fats") setFats(val);

    // Optional smart calorie suggestion if calories field is untouched
    const p = field === "protein" ? Number(val) || 0 : Number(protein) || 0;
    const c = field === "carbs" ? Number(val) || 0 : Number(carbs) || 0;
    const f = field === "fats" ? Number(val) || 0 : Number(fats) || 0;

    if (!calories || calories === "0") {
      const estimatedKcal = Math.round(p * 4 + c * 4 + f * 9);
      if (estimatedKcal > 0) {
        setCalories(String(estimatedKcal));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const calNum = Number(calories) || 0;
    const pNum = Number(protein) || 0;
    const cNum = Number(carbs) || 0;
    const fNum = Number(fats) || 0;

    // Fallback: If calories 0 but macros provided, calculate 4*P + 4*C + 9*F
    const finalCalories =
      calNum > 0 ? calNum : Math.round(pNum * 4 + cNum * 4 + fNum * 9);

    if (finalCalories === 0 && pNum === 0 && cNum === 0 && fNum === 0) {
      return;
    }

    const currentTime = new Date().toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const item: MacroMealItem = {
      id: "quick_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      name: name.trim() || "Quick Add",
      category: targetSlot,
      grams: 100,
      calories: finalCalories,
      protein: pNum,
      carbs: cNum,
      fats: fNum,
      time: currentTime,
    };

    onAddMealItem(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Zap className="size-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                Quick Add Macros
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Destinație:{" "}
                <span className="text-amber-400 font-bold">{targetSlot}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          {/* Optional Meal/Item Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Nume Aliment / Masă (opțional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='implicit: "Quick Add"'
              className="w-full h-11 px-4 rounded-2xl bg-zinc-900 border border-white/10 text-sm font-semibold text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Calories Hero Input */}
          <div className="p-4 rounded-3xl bg-orange-500/10 border border-orange-500/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                <Flame className="size-4" />
                <span>Calorii Totale *</span>
              </label>
              <span className="text-[10px] font-bold text-orange-400/80">kcal</span>
            </div>
            <input
              type="number"
              min={0}
              max={10000}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="ex: 450"
              className="w-full h-12 px-4 rounded-2xl bg-black/60 border border-orange-500/30 text-xl font-black text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
              autoFocus
            />
          </div>

          {/* 3 Macro Inputs: Protein, Carbs, Fats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* Protein */}
            <div className="min-w-0 p-2.5 sm:p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1.5">
              <label className="min-w-0 text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-wider text-blue-400 flex items-center gap-1">
                <Dumbbell className="size-3 shrink-0 hidden min-[380px]:block" />
                <span className="truncate">Proteine</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={1000}
                  value={protein}
                  onChange={(e) => handleMacroChange("protein", e.target.value)}
                  placeholder="0"
                  className="w-full h-10 px-2.5 text-center rounded-xl bg-black/60 border border-blue-500/30 text-base font-black text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <span className="text-[9px] font-bold text-zinc-500 block text-center">
                grame
              </span>
            </div>

            {/* Carbs */}
            <div className="min-w-0 p-2.5 sm:p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
              <label className="min-w-0 text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-wider text-amber-400 flex items-center gap-1">
                <Wheat className="size-3 shrink-0 hidden min-[380px]:block" />
                <span className="truncate" title="Carbohidrați">Carbohidrați</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={1000}
                  value={carbs}
                  onChange={(e) => handleMacroChange("carbs", e.target.value)}
                  placeholder="0"
                  className="w-full h-10 px-2.5 text-center rounded-xl bg-black/60 border border-amber-500/30 text-base font-black text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <span className="text-[9px] font-bold text-zinc-500 block text-center">
                grame
              </span>
            </div>

            {/* Fats */}
            <div className="min-w-0 p-2.5 sm:p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1.5">
              <label className="min-w-0 text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-wider text-rose-400 flex items-center gap-1">
                <Droplet className="size-3 shrink-0 hidden min-[380px]:block" />
                <span className="truncate">Grăsimi</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={1000}
                  value={fats}
                  onChange={(e) => handleMacroChange("fats", e.target.value)}
                  placeholder="0"
                  className="w-full h-10 px-2.5 text-center rounded-xl bg-black/60 border border-rose-500/30 text-base font-black text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
              <span className="text-[9px] font-bold text-zinc-500 block text-center">
                grame
              </span>
            </div>
          </div>

          {/* Submit CTA Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/20 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Check className="size-4 stroke-[3]" />
            <span>Adaugă în {targetSlot}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
