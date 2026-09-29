import React, { useState, useMemo } from "react";
import { 
  Calculator, 
  X, 
  Check, 
  TrendingUp, 
  Flame, 
  Dumbbell, 
  Zap, 
  Target,
  Sparkles,
  Droplets
} from "lucide-react";
import { MacroGoal, MetabolicProfile } from "../../types";

interface MetabolicWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoal: MacroGoal;
  onApplyGoal: (goal: MacroGoal) => void;
}

export const MetabolicWizardModal: React.FC<MetabolicWizardModalProps> = ({
  isOpen,
  onClose,
  currentGoal,
  onApplyGoal,
}) => {
  const [gender, setGender] = useState<"male" | "female">("male");
  const [age, setAge] = useState<number>(26);
  const [weightKg, setWeightKg] = useState<number>(80);
  const [heightCm, setHeightCm] = useState<number>(180);
  const [activityLevel, setActivityLevel] = useState<
    "sedentary" | "light" | "moderate" | "active" | "very_active"
  >("moderate");
  const [goalType, setGoalType] = useState<"hypertrophy" | "maintenance" | "cutting">(
    currentGoal.type || "hypertrophy"
  );
  const [targetRate, setTargetRate] = useState<number>(0.25); // kg/week

  // Calculate BMR & TDEE using Mifflin-St Jeor
  const calculation = useMemo(() => {
    // BMR formula
    let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
    if (gender === "male") {
      bmr += 5;
    } else {
      bmr -= 161;
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    const tdee = Math.round(bmr * activityMultipliers[activityLevel]);

    let targetCalories = tdee;
    let proteinPerKg = 2.2;

    if (goalType === "hypertrophy") {
      // Lean bulk: +250 to +350 kcal (~10-12% surplus)
      targetCalories = Math.round(tdee + 320);
      proteinPerKg = 2.1;
    } else if (goalType === "cutting") {
      // Moderate deficit: -400 to -500 kcal (~18% deficit)
      targetCalories = Math.round(tdee - 450);
      proteinPerKg = 2.4; // higher protein during deficit to preserve lean mass
    } else {
      // Recomposition / maintenance
      targetCalories = tdee;
      proteinPerKg = 2.2;
    }

    const proteinGrams = Math.round(weightKg * proteinPerKg);
    const proteinCalories = proteinGrams * 4;

    // Fats: ~22-25% of calories or ~0.9g/kg
    const fatGrams = Math.round(Math.max(weightKg * 0.85, (targetCalories * 0.23) / 9));
    const fatCalories = fatGrams * 9;

    // Carbs: rest of calories
    const remainingCalories = Math.max(0, targetCalories - (proteinCalories + fatCalories));
    const carbsGrams = Math.round(remainingCalories / 4);

    // Fiber: ~14g per 1000 kcal
    const fiberGrams = Math.round((targetCalories / 1000) * 14);

    // Recommended Water: ~40ml/kg
    const waterMl = Math.round(weightKg * 42);

    return {
      bmr: Math.round(bmr),
      tdee,
      targetCalories,
      proteinGrams,
      carbsGrams,
      fatGrams,
      fiberGrams,
      waterMl,
    };
  }, [gender, age, weightKg, heightCm, activityLevel, goalType]);

  const handleApply = () => {
    const newGoal: MacroGoal = {
      type: goalType,
      calories: calculation.targetCalories,
      protein: calculation.proteinGrams,
      carbs: calculation.carbsGrams,
      fats: calculation.fatGrams,
      fiber: calculation.fiberGrams,
      waterMl: calculation.waterMl,
    };
    onApplyGoal(newGoal);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-zinc-950 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500">
              <Calculator className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Calculator Metabolic & Macro Wizard
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Ecuația Mifflin-St Jeor pentru Hipertrofie & Compoziție Corporală
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Step 1: Physical Data */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2.5">
              1. Date Biometrice
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Gender */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
                  Sex
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setGender("male")}
                    className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      gender === "male"
                        ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 dark:text-zinc-500"
                    }`}
                  >
                    Bărbat
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender("female")}
                    className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      gender === "female"
                        ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 dark:text-zinc-500"
                    }`}
                  >
                    Femeie
                  </button>
                </div>
              </div>

              {/* Age */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
                  Vârstă (ani)
                </label>
                <input
                  type="number"
                  min={14}
                  max={90}
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value, 10) || 25)}
                  className="w-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Weight */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
                  Greutate (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={35}
                  max={200}
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 75)}
                  className="w-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Height */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
                  Înălțime (cm)
                </label>
                <input
                  type="number"
                  min={120}
                  max={230}
                  value={heightCm}
                  onChange={(e) => setHeightCm(parseInt(e.target.value, 10) || 175)}
                  className="w-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Activity Level */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2">
              2. Nivel de Activitate & Cheltuială Calorică
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { key: "sedentary", title: "Sedentar (x1.2)", desc: "Muncă de birou, fără antrenament" },
                { key: "light", title: "Ușor Activ (x1.375)", desc: "1-2 antrenamente ușoare / săptămână" },
                { key: "moderate", title: "Moderat Activ (x1.55)", desc: "3-5 antrenamente de forță / săpt" },
                { key: "active", title: "Foarte Activ (x1.725)", desc: "6-7 antrenamente grele / săpt" },
                { key: "very_active", title: "Extrem de Activ (x1.9)", desc: "Antrenamente intense + muncă fizică" },
              ].map((lvl) => (
                <div
                  key={lvl.key}
                  onClick={() => setActivityLevel(lvl.key as typeof activityLevel)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    activityLevel === lvl.key
                      ? "bg-orange-500/10 border-orange-500 text-slate-900 dark:text-white"
                      : "bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-white/5 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <p className="text-xs font-black text-slate-900 dark:text-white">{lvl.title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5">{lvl.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Goal Selection */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2">
              3. Obiectiv Principal
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div
                onClick={() => setGoalType("hypertrophy")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  goalType === "hypertrophy"
                    ? "bg-orange-500/15 border-orange-500 shadow-md"
                    : "bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-white/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flame className="size-4 text-orange-500" />
                  <p className="text-xs font-black text-slate-900 dark:text-white">
                    Hipertrofie (Lean Bulk)
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                  Surplus caloric moderat (+300 kcal). Rată de creștere: +0.25 - +0.35 kg/săpt fără exces de grăsime.
                </p>
              </div>

              <div
                onClick={() => setGoalType("maintenance")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  goalType === "maintenance"
                    ? "bg-blue-500/15 border-blue-500 shadow-md"
                    : "bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-white/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="size-4 text-blue-500" />
                  <p className="text-xs font-black text-slate-900 dark:text-white">
                    Recompoziție Corporală
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                  Mentenanță TDEE cu 2.2g proteine/kg. Schimbare treptată a compoziției: mușchi în sus, grăsime în jos.
                </p>
              </div>

              <div
                onClick={() => setGoalType("cutting")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  goalType === "cutting"
                    ? "bg-rose-500/15 border-rose-500 shadow-md"
                    : "bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-white/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-rose-500" />
                  <p className="text-xs font-black text-slate-900 dark:text-white">
                    Definire (Fat Loss)
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                  Deficit caloric de -450 kcal și 2.4g proteine/kg pentru conservarea masei musculare dobândite.
                </p>
              </div>
            </div>
          </div>

          {/* Results Summary Box */}
          <div className="p-4 rounded-3xl bg-slate-900 dark:bg-zinc-900 border border-slate-700 dark:border-white/10 text-white space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Rată Metabolică Calculată
                </span>
                <p className="text-xs text-slate-300">
                  BMR: <strong className="text-white">{calculation.bmr} kcal</strong> | TDEE (Mentenanță): <strong className="text-white">{calculation.tdee} kcal</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                  Țintă Zilnică Nouă
                </span>
                <p className="text-2xl font-black text-orange-400">
                  {calculation.targetCalories} <span className="text-xs text-white">kcal</span>
                </p>
              </div>
            </div>

            {/* Macro Targets */}
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">Proteine</span>
                <p className="text-xl font-black text-white">{calculation.proteinGrams}g</p>
                <span className="text-[9px] text-slate-400">{(calculation.proteinGrams / weightKg).toFixed(1)}g / kg</span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">Carbohidrați</span>
                <p className="text-xl font-black text-white">{calculation.carbsGrams}g</p>
                <span className="text-[9px] text-slate-400">Glicogen & Forță</span>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">Grăsimi</span>
                <p className="text-xl font-black text-white">{calculation.fatGrams}g</p>
                <span className="text-[9px] text-slate-400">Hormoni & Testo</span>
              </div>

              <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Apă / Hidratare</span>
                <p className="text-xl font-black text-white">{(calculation.waterMl / 1000).toFixed(1)}L</p>
                <span className="text-[9px] text-slate-400">Fibre: {calculation.fiberGrams}g</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 bg-slate-50 dark:bg-zinc-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          >
            Renunță
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-3.5 px-5 bg-orange-500 hover:bg-orange-600 text-black font-black text-sm tracking-wide uppercase rounded-2xl shadow-lg shadow-orange-500/20 cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <Check className="size-4 stroke-[3]" />
            Aplică Obiectivele în Jurnal
          </button>
        </div>
      </div>
    </div>
  );
};
