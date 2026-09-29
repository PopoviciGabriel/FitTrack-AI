import React, { useState, useEffect, useMemo } from "react";
import { 
  Flame, 
  Dumbbell, 
  Sparkles, 
  Calculator, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Apple, 
  Clock, 
  TrendingUp, 
  Award, 
  Target, 
  Zap, 
  Coffee, 
  UtensilsCrossed, 
  Sun, 
  Moon, 
  Cookie,
  Check
} from "lucide-react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { MacroDay, MacroMealItem, MacroGoal, MealSlotCategory } from "../types";
import { ProGuard } from "./ProGuard";
import { HydrationCard } from "./nutrition/HydrationCard";
import { FoodSearchModal } from "./nutrition/FoodSearchModal";
import { MetabolicWizardModal } from "./nutrition/MetabolicWizardModal";
import { AiMealModal } from "./nutrition/AiMealModal";
import { WeeklyAdherenceChart } from "./nutrition/WeeklyAdherenceChart";

interface NutritionViewProps {
  onUpgradeClick: () => void;
}

const DEFAULT_GOAL: MacroGoal = {
  type: "hypertrophy",
  calories: 2850,
  protein: 180,
  carbs: 330,
  fats: 75,
  fiber: 38,
  waterMl: 3500,
};

const MEAL_SLOTS: {
  key: MealSlotCategory;
  name: string;
  subtitle: string;
  icon: React.ElementType;
}[] = [
  { key: "mic_dejun", name: "Mic Dejun", subtitle: "Start metabolic & absorbție lentă", icon: Coffee },
  { key: "pranz", name: "Prânz", subtitle: "Densitate proteică & carbohidrați", icon: Sun },
  { key: "pre_workout", name: "Pre-Workout", subtitle: "Energie rapidă & glicogen", icon: Zap },
  { key: "post_workout", name: "Post-Workout", subtitle: "Shake & reîncărcare celulară", icon: Dumbbell },
  { key: "cina", name: "Cină", subtitle: "Refacere neuromusculară", icon: Moon },
  { key: "gustari", name: "Gustări & Altele", subtitle: "Micronutrienți & ajustare", icon: Cookie },
];

export const NutritionView: React.FC<NutritionViewProps> = ({ onUpgradeClick }) => {
  const [activeDate, setActiveDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  
  // User Goal State
  const [goal, setGoal] = useState<MacroGoal>(() => {
    const saved = localStorage.getItem("fittrack_macro_goal");
    return saved ? JSON.parse(saved) : DEFAULT_GOAL;
  });

  // Current Day Log State
  const [dayLog, setDayLog] = useState<MacroDay>(() => {
    const saved = localStorage.getItem(`fittrack_nutrition_${activeDate}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Parse error for date", e);
      }
    }
    return {
      date: activeDate,
      targetCalories: goal.calories,
      targetProtein: goal.protein,
      targetCarbs: goal.carbs,
      targetFats: goal.fats,
      targetFiber: goal.fiber || 38,
      targetWaterMl: goal.waterMl || 3500,
      waterMl: 0,
      meals: [],
    };
  });

  // Load dayLog whenever activeDate changes
  useEffect(() => {
    const saved = localStorage.getItem(`fittrack_nutrition_${activeDate}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDayLog({
          ...parsed,
          waterMl: parsed.waterMl || 0,
          targetWaterMl: parsed.targetWaterMl || goal.waterMl || 3500,
          meals: parsed.meals || [],
        });
        return;
      } catch (e) {
        console.warn("Day load error:", e);
      }
    }

    setDayLog({
      date: activeDate,
      targetCalories: goal.calories,
      targetProtein: goal.protein,
      targetCarbs: goal.carbs,
      targetFats: goal.fats,
      targetFiber: goal.fiber || 38,
      targetWaterMl: goal.waterMl || 3500,
      waterMl: 0,
      meals: [],
    });
  }, [activeDate, goal]);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(`fittrack_nutrition_${activeDate}`, JSON.stringify(dayLog));
  }, [dayLog, activeDate]);

  useEffect(() => {
    localStorage.setItem("fittrack_macro_goal", JSON.stringify(goal));
  }, [goal]);

  // Modals visibility
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [selectedSlotForAdd, setSelectedSlotForAdd] = useState<MealSlotCategory>("pranz");
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [showAiMealModal, setShowAiMealModal] = useState(false);
  const [showAdherenceChart, setShowAdherenceChart] = useState(false);

  // Collapsible slots state
  const [collapsedSlots, setCollapsedSlots] = useState<Record<string, boolean>>({});

  const toggleSlotCollapse = (slotKey: string) => {
    setCollapsedSlots((prev) => ({ ...prev, [slotKey]: !prev[slotKey] }));
  };

  // Day Totals calculation
  const totals = useMemo(() => {
    let kcal = 0;
    let p = 0;
    let c = 0;
    let f = 0;
    let fiber = 0;
    let sod = 0;

    dayLog.meals.forEach((m) => {
      kcal += m.calories || 0;
      p += m.protein || 0;
      c += m.carbs || 0;
      f += m.fats || 0;
      fiber += m.fiber || 0;
      sod += m.sodium || 0;
    });

    return {
      calories: Math.round(kcal),
      protein: Math.round(p),
      carbs: Math.round(c),
      fats: Math.round(f),
      fiber: Math.round(fiber),
      sodium: Math.round(sod),
    };
  }, [dayLog.meals]);

  // Add Item to Day
  const handleAddMealItem = (item: MacroMealItem) => {
    setDayLog((prev) => ({
      ...prev,
      meals: [item, ...prev.meals],
    }));
  };

  // Remove Item from Day
  const handleRemoveMealItem = (id: string) => {
    setDayLog((prev) => ({
      ...prev,
      meals: prev.meals.filter((m) => m.id !== id),
    }));
  };

  // Update Hydration
  const handleUpdateWater = (newAmount: number) => {
    setDayLog((prev) => ({
      ...prev,
      waterMl: newAmount,
    }));
  };

  // Apply new Goal from Wizard
  const handleApplyNewGoal = (newGoal: MacroGoal) => {
    setGoal(newGoal);
    setDayLog((prev) => ({
      ...prev,
      targetCalories: newGoal.calories,
      targetProtein: newGoal.protein,
      targetCarbs: newGoal.carbs,
      targetFats: newGoal.fats,
      targetFiber: newGoal.fiber || 38,
      targetWaterMl: newGoal.waterMl || 3500,
    }));
  };

  // Date navigation helpers
  const handlePrevDay = () => {
    const current = parseISO(activeDate);
    setActiveDate(format(subDays(current, 1), "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
    const current = parseISO(activeDate);
    setActiveDate(format(addDays(current, 1), "yyyy-MM-dd"));
  };

  const handleToday = () => {
    setActiveDate(format(new Date(), "yyyy-MM-dd"));
  };

  const isToday = activeDate === format(new Date(), "yyyy-MM-dd");

  const openFoodSearchForSlot = (slot: MealSlotCategory) => {
    setSelectedSlotForAdd(slot);
    setShowFoodModal(true);
  };

  const openAiMealForSlot = (slot: MealSlotCategory) => {
    setSelectedSlotForAdd(slot);
    setShowAiMealModal(true);
  };

  const calorieDiff = (dayLog.targetCalories || goal.calories) - totals.calories;
  const caloriePercent = Math.min(Math.round((totals.calories / (dayLog.targetCalories || goal.calories)) * 100), 100);

  return (
    <ProGuard
      title="Modulul Nutriție Sportivă PRO"
      description="Sistem complet de dietetică sportivă pentru hipertrofie și definire. Bază de date cu 40+ alimente de culturism, calculator metabolic BMR/TDEE, tracker de hidratare și AI Chef Gemini."
      onUpgradeClick={onUpgradeClick}
      badge="PRO LIFETIME"
    >
      <div className="space-y-6 pb-24 animate-in fade-in duration-300">
        {/* HEADER & DATE SELECTOR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Dietetică & Nutriție PRO
              </h1>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-500 border border-orange-500/30">
                {goal.type === "hypertrophy"
                  ? "Hipertrofie Musculară"
                  : goal.type === "cutting"
                  ? "Definire / Fat Loss"
                  : "Recompoziție"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Urmărire avansată a caloriilor, macro-nutrienților, hidratării și aderenței
            </p>
          </div>

          {/* Date Selector Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 self-start sm:self-auto">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 cursor-pointer transition-colors"
              title="Ziua anterioară"
            >
              <ChevronLeft className="size-4" />
            </button>

            <button
              type="button"
              onClick={handleToday}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                isToday
                  ? "bg-orange-500 text-black shadow-sm"
                  : "hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
              }`}
            >
              {isToday ? "Azi" : format(parseISO(activeDate), "d MMMM", { locale: ro })}
            </button>

            <button
              type="button"
              onClick={handleNextDay}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 cursor-pointer transition-colors"
              title="Ziua următoare"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* QUICK TOOLBAR BUTTONS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setShowWizardModal(true)}
            className="p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900/90 dark:hover:bg-zinc-800 border border-slate-200 dark:border-white/10 text-left cursor-pointer transition-all active:scale-[0.98] group"
          >
            <div className="flex items-center gap-2 text-orange-500 mb-1">
              <Calculator className="size-4 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-wider">Wizard BMR & TDEE</span>
            </div>
            <p className="text-xs font-black text-slate-900 dark:text-white">Calculator Metabolic</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedSlotForAdd("pranz");
              setShowAiMealModal(true);
            }}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-orange-500/10 hover:from-purple-500/20 hover:to-orange-500/20 border border-purple-500/30 text-left cursor-pointer transition-all active:scale-[0.98] group"
          >
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <Sparkles className="size-4 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-wider">Gemini 3.8 Flash</span>
            </div>
            <p className="text-xs font-black text-slate-900 dark:text-white">AI Meal Scanner & Chef</p>
          </button>

          <button
            type="button"
            onClick={() => openFoodSearchForSlot("pranz")}
            className="p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900/90 dark:hover:bg-zinc-800 border border-slate-200 dark:border-white/10 text-left cursor-pointer transition-all active:scale-[0.98] group"
          >
            <div className="flex items-center gap-2 text-blue-500 mb-1">
              <Apple className="size-4 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-wider">40+ Alimente</span>
            </div>
            <p className="text-xs font-black text-slate-900 dark:text-white">Bază Alimentară Sportivă</p>
          </button>

          <button
            type="button"
            onClick={() => setShowAdherenceChart(!showAdherenceChart)}
            className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all active:scale-[0.98] group ${
              showAdherenceChart
                ? "bg-orange-500/15 border-orange-500 text-orange-500"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900/90 dark:hover:bg-zinc-800 border-slate-200 dark:border-white/10"
            }`}
          >
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <TrendingUp className="size-4 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-wider">7 Zile Istoric</span>
            </div>
            <p className="text-xs font-black text-slate-900 dark:text-white">Grafic Aderență</p>
          </button>
        </div>

        {/* OPTIONAL EXPANDED ADHERENCE CHART */}
        {showAdherenceChart && (
          <div className="animate-in fade-in duration-200">
            <WeeklyAdherenceChart currentGoal={goal} />
          </div>
        )}

        {/* MAIN CALORIES & MACROS SUMMARY CARD */}
        <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-zinc-950 to-slate-900 text-white border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Calories Main Gauge */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Bilanț Caloric Zilnic
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <h2 className="text-4xl font-black tracking-tight text-white">
                      {totals.calories}
                    </h2>
                    <span className="text-sm font-semibold text-slate-400">
                      / {dayLog.targetCalories || goal.calories} kcal
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black ${
                      calorieDiff >= 0
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    <Flame className="size-3.5" />
                    {calorieDiff >= 0 ? `${calorieDiff} kcal rămase` : `${Math.abs(calorieDiff)} kcal surplus`}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden p-0.5 mt-3">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${caloriePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* 4 MACRO CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
            {/* Protein */}
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                  Proteine
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {Math.round((totals.protein / (dayLog.targetProtein || goal.protein)) * 100)}%
                </span>
              </div>
              <p className="text-2xl font-black text-white mt-1">
                {totals.protein}g
              </p>
              <p className="text-[11px] text-slate-400">
                țintă: {dayLog.targetProtein || goal.protein}g
              </p>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((totals.protein / (dayLog.targetProtein || goal.protein)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Carbohidrați
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {Math.round((totals.carbs / (dayLog.targetCarbs || goal.carbs)) * 100)}%
                </span>
              </div>
              <p className="text-2xl font-black text-white mt-1">
                {totals.carbs}g
              </p>
              <p className="text-[11px] text-slate-400">
                țintă: {dayLog.targetCarbs || goal.carbs}g
              </p>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((totals.carbs / (dayLog.targetCarbs || goal.carbs)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Fats */}
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                  Grăsimi
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {Math.round((totals.fats / (dayLog.targetFats || goal.fats)) * 100)}%
                </span>
              </div>
              <p className="text-2xl font-black text-white mt-1">
                {totals.fats}g
              </p>
              <p className="text-[11px] text-slate-400">
                țintă: {dayLog.targetFats || goal.fats}g
              </p>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((totals.fats / (dayLog.targetFats || goal.fats)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Fiber */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Fibre Dietetice
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {Math.round((totals.fiber / (dayLog.targetFiber || goal.fiber || 38)) * 100)}%
                </span>
              </div>
              <p className="text-2xl font-black text-white mt-1">
                {totals.fiber}g
              </p>
              <p className="text-[11px] text-slate-400">
                țintă: {dayLog.targetFiber || goal.fiber || 38}g
              </p>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((totals.fiber / (dayLog.targetFiber || goal.fiber || 38)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* MICRONUTRIENTS STRIP */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5 text-xs text-slate-400">
            <span>Sodiu total: <strong className="text-white">{totals.sodium} mg</strong></span>
            <span>Aport Hidric: <strong className="text-cyan-400">{dayLog.waterMl} ml</strong></span>
            <span>Alimente înregistrate: <strong className="text-white">{dayLog.meals.length}</strong></span>
          </div>
        </div>

        {/* HYDRATION TRACKER CARD */}
        <HydrationCard
          waterMl={dayLog.waterMl}
          targetWaterMl={dayLog.targetWaterMl || goal.waterMl || 3500}
          onUpdateWater={handleUpdateWater}
        />

        {/* STRUCTURED MEAL SLOTS SECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Mese Structurate pe Categorii
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Organizează nutriția conform orelor de antrenament și sinteză proteică
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {MEAL_SLOTS.map((slot) => {
              const Icon = slot.icon;
              const isCollapsed = !!collapsedSlots[slot.key];

              // Filter meals belonging to this category
              // Also support legacy items without category by assigning them to 'gustari'
              const slotMeals = dayLog.meals.filter(
                (m) => m.category === slot.key || (!m.category && slot.key === "gustari")
              );

              const slotKcal = slotMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
              const slotProtein = slotMeals.reduce((sum, m) => sum + (m.protein || 0), 0);

              return (
                <div
                  key={slot.key}
                  className="rounded-[2rem] bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-white/5 shadow-md overflow-hidden transition-all"
                >
                  {/* Slot Header */}
                  <div
                    onClick={() => toggleSlotCollapse(slot.key)}
                    className="p-4.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                            {slot.name}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                            {slotMeals.length} {slotMeals.length === 1 ? "aliment" : "alimente"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                          {slot.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          {Math.round(slotKcal)} <span className="text-xs font-normal text-slate-400">kcal</span>
                        </p>
                        <p className="text-xs font-black text-blue-500">
                          {Math.round(slotProtein)}g <span className="text-[10px] font-normal text-slate-400">P</span>
                        </p>
                      </div>

                      <div className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white">
                        {isCollapsed ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Slot Expanded Content */}
                  {!isCollapsed && (
                    <div className="px-4.5 pb-4.5 pt-1 border-t border-slate-100 dark:border-white/5 space-y-3">
                      {/* Logged items in this slot */}
                      {slotMeals.length > 0 ? (
                        <div className="space-y-1.5">
                          {slotMeals.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 group"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h5 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {item.name}
                                  </h5>
                                  {item.time && (
                                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                                      {item.time}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                  <span><strong>{item.calories}</strong> kcal</span>
                                  <span>P: <strong className="text-blue-500">{item.protein}g</strong></span>
                                  <span>C: <strong>{item.carbs}g</strong></span>
                                  <span>G: <strong>{item.fats}g</strong></span>
                                  {item.fiber ? <span>F: <strong>{item.fiber}g</strong></span> : null}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveMealItem(item.id)}
                                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                                title="Șterge aliment"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-zinc-500 italic py-2">
                          Niciun aliment adăugat încă în {slot.name}.
                        </p>
                      )}

                      {/* Add Buttons for this slot */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openFoodSearchForSlot(slot.key)}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-500 dark:text-orange-400 text-xs font-black tracking-wide flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                        >
                          <Plus className="size-3.5 stroke-[3]" />
                          <span>Adaugă Aliment în {slot.name}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openAiMealForSlot(slot.key)}
                          className="py-2.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-500 dark:text-purple-400 text-xs font-black flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all"
                          title="Generează cu AI"
                        >
                          <Sparkles className="size-3.5" />
                          <span className="hidden sm:inline">AI Chef</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* MODALS */}
        <FoodSearchModal
          isOpen={showFoodModal}
          onClose={() => setShowFoodModal(false)}
          defaultCategory={selectedSlotForAdd}
          onAddMealItem={handleAddMealItem}
        />

        <MetabolicWizardModal
          isOpen={showWizardModal}
          onClose={() => setShowWizardModal(false)}
          currentGoal={goal}
          onApplyGoal={handleApplyNewGoal}
        />

        <AiMealModal
          isOpen={showAiMealModal}
          onClose={() => setShowAiMealModal(false)}
          defaultCategory={selectedSlotForAdd}
          onAddMealItem={handleAddMealItem}
          targetCalories={goal.calories}
          targetProtein={goal.protein}
        />
      </div>
    </ProGuard>
  );
};
