import React, { useState, useEffect } from "react";
import { Plus, Trash2, Utensils, Flame, Sparkles, Target, X, Check } from "lucide-react";
import { MacroDay, MacroMealItem, MacroGoal } from "../types";
import { ProGuard } from "./ProGuard";

interface NutritionViewProps {
  onUpgradeClick: () => void;
}

const DEFAULT_GOAL: MacroGoal = {
  type: "hypertrophy",
  calories: 2800,
  protein: 175,
  carbs: 320,
  fats: 75,
};

const PRESET_MEALS = [
  { name: "Shake Izolat Proteic & Banană", calories: 240, protein: 32, carbs: 26, fats: 2 },
  { name: "Piept de Pui cu Orez Basmati", calories: 560, protein: 52, carbs: 65, fats: 8 },
  { name: "Omletă din 4 Ouă & Pâine Integrală", calories: 440, protein: 30, carbs: 32, fats: 22 },
  { name: "Iaurt Grecesc 2% & Fructe de Pădure", calories: 210, protein: 22, carbs: 24, fats: 4 },
  { name: "Vită la Grătar cu Cartofi Dulci", calories: 620, protein: 48, carbs: 55, fats: 18 },
  { name: "Ton în Suc Propriu & Paste Integrale", calories: 480, protein: 44, carbs: 60, fats: 6 },
];

export const NutritionView: React.FC<NutritionViewProps> = ({ onUpgradeClick }) => {
  const todayKey = new Date().toISOString().split("T")[0];
  const [goal, setGoal] = useState<MacroGoal>(() => {
    const saved = localStorage.getItem("fittrack_macro_goal");
    return saved ? JSON.parse(saved) : DEFAULT_GOAL;
  });

  const [dayLog, setDayLog] = useState<MacroDay>(() => {
    const saved = localStorage.getItem(`fittrack_nutrition_${todayKey}`);
    return saved
      ? JSON.parse(saved)
      : {
          date: todayKey,
          targetCalories: goal.calories,
          targetProtein: goal.protein,
          targetCarbs: goal.carbs,
          targetFats: goal.fats,
          meals: [],
        };
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [showGoalModal, setShowGoalModal] = useState(false);

  useEffect(() => {
    localStorage.setItem("fittrack_macro_goal", JSON.stringify(goal));
  }, [goal]);

  useEffect(() => {
    localStorage.setItem(`fittrack_nutrition_${todayKey}`, JSON.stringify(dayLog));
  }, [dayLog, todayKey]);

  // Calculate totals
  const totalCalories = dayLog.meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = dayLog.meals.reduce((sum, m) => sum + m.protein, 0);
  const totalCarbs = dayLog.meals.reduce((sum, m) => sum + m.carbs, 0);
  const totalFats = dayLog.meals.reduce((sum, m) => sum + m.fats, 0);

  const addMeal = (item: MacroMealItem) => {
    setDayLog((prev) => ({
      ...prev,
      meals: [item, ...prev.meals],
    }));
  };

  const removeMeal = (id: string) => {
    setDayLog((prev) => ({
      ...prev,
      meals: prev.meals.filter((m) => m.id !== id),
    }));
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName.trim()) return;
    const newItem: MacroMealItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: mealName.trim(),
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fats: parseFloat(fats) || 0,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    addMeal(newItem);
    setMealName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFats("");
    setShowAddModal(false);
  };

  const applyPreset = (preset: typeof PRESET_MEALS[0]) => {
    addMeal({
      id: Math.random().toString(36).substring(2, 9),
      name: preset.name,
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fats: preset.fats,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    setShowAddModal(false);
  };

  const setGoalType = (type: "hypertrophy" | "maintenance" | "cutting") => {
    if (type === "hypertrophy") {
      setGoal({ type, calories: 2900, protein: 180, carbs: 340, fats: 80 });
    } else if (type === "maintenance") {
      setGoal({ type, calories: 2450, protein: 165, carbs: 280, fats: 70 });
    } else {
      setGoal({ type, calories: 2050, protein: 185, carbs: 180, fats: 55 });
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="py-8 px-6 sticky top-0 bg-[#f4f7f0] dark:bg-[#0A0A0A] z-20 border-b border-slate-200 dark:border-white/5 -mx-4 transition-all flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-zinc-50 uppercase leading-none">
            Nutriție.
          </h1>
          <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1.5 leading-none">
            Calorii & Macronutrienți
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGoalModal(true)}
            className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-slate-700 dark:text-zinc-300 hover:text-blue-600 cursor-pointer shadow-sm"
            title="Setează Obiectiv"
          >
            <Target className="size-5" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 dark:bg-orange-500 hover:bg-blue-700 dark:hover:bg-orange-600 text-white dark:text-black p-3 rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </header>

      <ProGuard feature="nutrition" onUpgradeClick={onUpgradeClick}>
        {/* Main Calorie & Macro Dashboard */}
        <div className="p-8 bg-white dark:bg-[#1a1a1a] border border-slate-200/70 dark:border-white/5 rounded-[2.5rem] shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-zinc-500">
                Obiectiv {goal.type === "hypertrophy" ? "Hipertrofie (+Surplus)" : goal.type === "cutting" ? "Definire (-Deficit)" : "Recompoziție"}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-black text-slate-950 dark:text-white tracking-tight">
                  {totalCalories}
                </span>
                <span className="text-slate-400 dark:text-zinc-500 font-bold text-sm">
                  / {goal.calories} kcal
                </span>
              </div>
            </div>
            <div className="size-16 rounded-3xl bg-blue-50 dark:bg-orange-500/10 border border-blue-100 dark:border-orange-500/20 flex flex-col items-center justify-center text-blue-600 dark:text-orange-500">
              <Flame className="size-7" />
            </div>
          </div>

          {/* Calorie Bar */}
          <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-orange-500 dark:to-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (totalCalories / goal.calories) * 100)}%` }}
            />
          </div>

          {/* Macro Split Grid */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {/* Protein */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                  Proteine
                </p>
                <p className="text-xl font-black text-blue-600 dark:text-orange-400 mt-1">
                  {totalProtein.toFixed(0)}g
                </p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                  țintă {goal.protein}g
                </p>
              </div>
              <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-blue-600 dark:bg-orange-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, (totalProtein / goal.protein) * 100)}%` }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                  Carbohidrați
                </p>
                <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {totalCarbs.toFixed(0)}g
                </p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                  țintă {goal.carbs}g
                </p>
              </div>
              <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, (totalCarbs / goal.carbs) * 100)}%` }}
                />
              </div>
            </div>

            {/* Fats */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                  Grăsimi
                </p>
                <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {totalFats.toFixed(0)}g
                </p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                  țintă {goal.fats}g
                </p>
              </div>
              <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, (totalFats / goal.fats) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Meals Log List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-slate-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
              Mese Înregistrate Astăzi ({dayLog.meals.length})
            </h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-wider hover:underline cursor-pointer"
            >
              + Adaugă Masă
            </button>
          </div>

          {dayLog.meals.map((meal) => (
            <div
              key={meal.id}
              className="flex items-center justify-between p-5 bg-white dark:bg-[#1a1a1a] border border-slate-200/60 dark:border-white/5 rounded-[2rem] shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                  <Utensils className="size-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-950 dark:text-white text-base leading-tight">
                    {meal.name}
                  </h4>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mt-1">
                    {meal.time} • P: {meal.protein}g | C: {meal.carbs}g | G: {meal.fats}g
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-black text-slate-900 dark:text-white text-base">
                  {meal.calories} kcal
                </span>
                <button
                  onClick={() => removeMeal(meal.id)}
                  className="p-2 text-slate-300 hover:text-red-500 dark:text-zinc-700 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}

          {dayLog.meals.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-[#1a1a1a] border border-dashed border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center">
              <Utensils className="size-12 text-slate-300 dark:text-zinc-700 mb-4" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                Nicio masă adăugată pentru astăzi
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-6 py-3 rounded-xl bg-blue-600 dark:bg-orange-500 text-white dark:text-black font-black text-[10px] uppercase tracking-wider cursor-pointer"
              >
                Înregistrează Prima Masă
              </button>
            </div>
          )}
        </div>
      </ProGuard>

      {/* Add Meal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tight">
                Adaugă Masă
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                Preseturi Rapide de Hipertrofie
              </span>
              <div className="grid grid-cols-1 gap-2">
                {PRESET_MEALS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyPreset(p)}
                    className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 hover:bg-blue-50 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer border border-slate-100 dark:border-transparent"
                  >
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{p.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-400">
                        {p.protein}g Proteine • {p.carbs}g Carbs
                      </p>
                    </div>
                    <span className="text-xs font-black text-blue-600 dark:text-orange-400">
                      {p.calories} kcal
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Form */}
            <form onSubmit={handleManualAdd} className="space-y-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                Sau Introdu Manual
              </span>
              <div>
                <input
                  type="text"
                  placeholder="Denumire masă (ex: Shake, Friptură)"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  required
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Calorii (kcal)"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-xs font-bold"
                />
                <input
                  type="number"
                  placeholder="Proteine (g)"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-xs font-bold"
                />
                <input
                  type="number"
                  placeholder="Carbohidrați (g)"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-xs font-bold"
                />
                <input
                  type="number"
                  placeholder="Grăsimi (g)"
                  value={fats}
                  onChange={(e) => setFats(e.target.value)}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-xs font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-blue-600 dark:bg-orange-500 text-white dark:text-black font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Salvează Masă
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Goal Config Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight">
                Obiectiv Nutrițional
              </h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { id: "hypertrophy", label: "Masă Musculară (Hipertrofie)", desc: "Surplus caloric moderat, proteine mari" },
                { id: "maintenance", label: "Recompoziție Corporală", desc: "Mentenanță calorică, ardere grăsimi & forță" },
                { id: "cutting", label: "Definire (Slăbire)", desc: "Deficit controlat, conservare masă musculară" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setGoalType(opt.id as any)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                    goal.type === opt.id
                      ? "border-blue-600 dark:border-orange-500 bg-blue-50/50 dark:bg-orange-500/10"
                      : "border-slate-200 dark:border-zinc-800"
                  }`}
                >
                  <div>
                    <p className="font-black text-xs text-slate-950 dark:text-white uppercase">{opt.label}</p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{opt.desc}</p>
                  </div>
                  {goal.type === opt.id && <Check className="size-4 text-blue-600 dark:text-orange-500 shrink-0" />}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowGoalModal(false)}
              className="w-full py-4 rounded-2xl bg-slate-950 dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-widest cursor-pointer"
            >
              Gata
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
