import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Apple, 
  Clock, 
  TrendingUp, 
  Zap, 
  Coffee, 
  Sun, 
  Moon, 
  Cookie,
  Droplets,
  RotateCcw,
  Check,
  ScanBarcode,
  Search,
  Filter,
  BarChart3,
  Copy,
  MessageSquareText,
  Utensils,
  FolderPlus
} from "lucide-react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { MacroDay, MacroMealItem, MacroGoal, MealSlotCategory, ProgressEntry } from "../types";
import { calculateDynamicTDEE } from "../services/algorithmService";
import {
  loadNutritionLogs,
  loadMacroDay,
  loadMacroGoal,
  saveMacroDay,
  saveMacroGoal,
  readJson,
  nutritionKey,
} from "../services/storageService";
import { ProGuard } from "./ProGuard";
import { TdeeEngineCard } from "./nutrition/TdeeEngineCard";
import { FoodSearchModal } from "./nutrition/FoodSearchModal";
import { MetabolicWizardModal } from "./nutrition/MetabolicWizardModal";
import { AiMealModal } from "./nutrition/AiMealModal";
import { WeeklyAdherenceChart } from "./nutrition/WeeklyAdherenceChart";
import { BarcodeScannerModal } from "./nutrition/BarcodeScannerModal";
import { NaturalLanguageModal } from "./nutrition/NaturalLanguageModal";
import { QuickMacroModal } from "./nutrition/QuickMacroModal";

interface NutritionViewProps {
  onUpgradeClick: () => void;
  progress: ProgressEntry[];
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

const buildEmptyDay = (dateKey: string, g: MacroGoal): MacroDay => ({
  date: dateKey,
  targetCalories: g.calories,
  targetProtein: g.protein,
  targetCarbs: g.carbs,
  targetFats: g.fats,
  targetFiber: g.fiber || 38,
  targetWaterMl: g.waterMl || 3500,
  waterMl: 0,
  meals: [],
  customSlots: [],
});

/** Rounded percentage that is 0 (never NaN/Infinity) when the target is missing. */
const safePercent = (value: number, target: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.round((value / target) * 100);
};

/**
 * Smart icon selector based on dynamic slot name keywords
 */
const getSlotIcon = (slotName: string): React.ElementType => {
  const lower = slotName.toLowerCase();
  if (lower.includes("dejun") || lower.includes("cafea") || lower.includes("dimineata") || lower.includes("breakfast")) {
    return Coffee;
  }
  if (lower.includes("pranz") || lower.includes("amiaza") || lower.includes("lunch")) {
    return Sun;
  }
  if (lower.includes("pre") || lower.includes("energie") || lower.includes("pump")) {
    return Zap;
  }
  if (lower.includes("post") || lower.includes("workout") || lower.includes("antrenament") || lower.includes("shake")) {
    return Dumbbell;
  }
  if (lower.includes("cina") || lower.includes("seara") || lower.includes("dinner") || lower.includes("noapte")) {
    return Moon;
  }
  if (lower.includes("gust") || lower.includes("snack") || lower.includes("desert") || lower.includes("cookie")) {
    return Cookie;
  }
  return Utensils;
};

/**
 * Modern SVG Circular Progress Ring Component
 */
const CircularRing: React.FC<{
  radius: number;
  strokeWidth: number;
  progress: number; // 0 to 100+
  strokeColor: string;
  trackColor: string;
  className?: string;
  children?: React.ReactNode;
}> = ({ radius, strokeWidth, progress, strokeColor, trackColor, className = "", children }) => {
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        height={radius * 2}
        width={radius * 2}
        className="rotate-[-90deg] transition-all duration-700"
      >
        {/* Track circle */}
        <circle
          className={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Active progress circle */}
        <circle
          className={`${strokeColor} transition-all duration-700 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      {/* Central content overlay */}
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
          {children}
        </div>
      )}
    </div>
  );
};

export const NutritionView: React.FC<NutritionViewProps> = ({ onUpgradeClick, progress }) => {
  const [activeDate, setActiveDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  
  // User Goal State
  const [goal, setGoal] = useState<MacroGoal>(() => loadMacroGoal(DEFAULT_GOAL));
  const goalRef = useRef(goal);
  goalRef.current = goal;

  // Current Day Log State
  const [dayLog, setDayLog] = useState<MacroDay>(() =>
    loadMacroDay(activeDate, buildEmptyDay(activeDate, goal))
  );

  // Reload only when the date changes: reacting to `goal` here would overwrite
  // the in-memory day with the previously stored one.
  useEffect(() => {
    setDayLog(loadMacroDay(activeDate, buildEmptyDay(activeDate, goalRef.current)));
  }, [activeDate]);

  // While switching days `dayLog` still belongs to the previous date for one
  // render; persisting it then would write yesterday's meals under today's key.
  useEffect(() => {
    if (dayLog.date !== activeDate) return;
    saveMacroDay(dayLog);
  }, [dayLog, activeDate]);

  useEffect(() => {
    saveMacroGoal(goal);
  }, [goal]);

  // Dynamic slots creation input state
  const [newSlotName, setNewSlotName] = useState("");

  // Modals visibility states
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showNaturalLanguageModal, setShowNaturalLanguageModal] = useState(false);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [showQuickMacroModal, setShowQuickMacroModal] = useState(false);
  const [selectedSlotForAdd, setSelectedSlotForAdd] = useState<MealSlotCategory>("Prânz");
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [showAiMealModal, setShowAiMealModal] = useState(false);
  const [showAdherenceChart, setShowAdherenceChart] = useState(false);

  // Copy feedback state per slot
  const [copyFeedback, setCopyFeedback] = useState<{ slot: string; text: string; success: boolean } | null>(null);

  // Collapsible slots state (default open for all slots)
  const [collapsedSlots, setCollapsedSlots] = useState<Record<string, boolean>>({});

  const toggleSlotCollapse = (slotKey: string) => {
    setCollapsedSlots((prev) => ({ ...prev, [slotKey]: !prev[slotKey] }));
  };

  // Adaptive TDEE: stored logs for the last 14 days, with the in-memory day
  // overriding storage (the persist effect runs after render).
  const dynamicTdee = useMemo(() => {
    const logs = loadNutritionLogs(14).filter((log) => log.date !== dayLog.date);
    logs.push(dayLog);
    return calculateDynamicTDEE(progress, logs);
  }, [progress, dayLog]);

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

  // Add Bulk Items from Natural Language AI to Day
  const handleAddBulkMealItems = (items: MacroMealItem[]) => {
    setDayLog((prev) => ({
      ...prev,
      meals: [...items, ...prev.meals],
    }));
  };

  // Remove Item from Day
  const handleRemoveMealItem = (id: string) => {
    setDayLog((prev) => ({
      ...prev,
      meals: prev.meals.filter((m) => m.id !== id),
    }));
  };

  // Dynamic Slots Management: Add new custom slot
  const handleAddNewSlot = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newSlotName.trim();
    if (!trimmed) return;

    const currentSlots = dayLog.customSlots || [];
    if (currentSlots.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      // If already exists, expand it and clear input
      setCollapsedSlots((prev) => ({ ...prev, [trimmed]: false }));
      setNewSlotName("");
      return;
    }

    setDayLog((prev) => ({
      ...prev,
      customSlots: [...(prev.customSlots || []), trimmed],
    }));
    setNewSlotName("");
    setSelectedSlotForAdd(trimmed);
  };

  // Preset quick addition
  const handleAddPresetSlot = (preset: string) => {
    const currentSlots = dayLog.customSlots || [];
    if (currentSlots.some((s) => s.toLowerCase() === preset.toLowerCase())) {
      setCollapsedSlots((prev) => ({ ...prev, [preset]: false }));
      return;
    }

    setDayLog((prev) => ({
      ...prev,
      customSlots: [...(prev.customSlots || []), preset],
    }));
    setSelectedSlotForAdd(preset);
  };

  // Remove dynamic slot
  const handleRemoveSlot = (slotToRemove: string) => {
    setDayLog((prev) => ({
      ...prev,
      customSlots: (prev.customSlots || []).filter((s) => s !== slotToRemove),
    }));
  };

  // Smart Copy: Dynamically copy specific meal slot from yesterday
  const handleCopyFromYesterday = (slotName: string) => {
    try {
      const current = parseISO(activeDate);
      const yesterdayStr = format(subDays(current, 1), "yyyy-MM-dd");
      const rawYesterday = readJson<unknown>(nutritionKey(yesterdayStr), null);

      if (!rawYesterday) {
        setCopyFeedback({
          slot: slotName,
          text: `Nu s-au găsit date înregistrate ieri (${format(subDays(current, 1), "d MMM", { locale: ro })}).`,
          success: false,
        });
        setTimeout(() => setCopyFeedback(null), 3500);
        return;
      }

      const yesterdayData = loadMacroDay(yesterdayStr, buildEmptyDay(yesterdayStr, goal));
      // Dynamically look for the exact custom slot name in yesterday's data
      const yesterdaySlotMeals = yesterdayData.meals.filter(
        (m) =>
          m.category === slotName ||
          (m.category && m.category.toLowerCase() === slotName.toLowerCase())
      );

      if (yesterdaySlotMeals.length === 0) {
        setCopyFeedback({
          slot: slotName,
          text: `Nu au existat alimente la masa "${slotName}" în ziua de ieri.`,
          success: false,
        });
        setTimeout(() => setCopyFeedback(null), 3500);
        return;
      }

      const currentTime = new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
      const clonedItems: MacroMealItem[] = yesterdaySlotMeals.map((item, idx) => ({
        ...item,
        id: "copy_" + Date.now() + "_" + idx + "_" + Math.random().toString(36).substring(2, 6),
        category: slotName,
        time: currentTime,
      }));

      setDayLog((prev) => ({
        ...prev,
        meals: [...clonedItems, ...prev.meals],
      }));

      setCopyFeedback({
        slot: slotName,
        text: `Copiat cu succes! ${clonedItems.length} ${clonedItems.length === 1 ? "aliment adăugat" : "alimente adăugate"}.`,
        success: true,
      });
      setTimeout(() => setCopyFeedback(null), 3500);
    } catch (err) {
      console.warn("Error copying from yesterday:", err);
    }
  };

  // Quick Inline Hydration update
  const handleUpdateWater = (newAmount: number) => {
    setDayLog((prev) => ({
      ...prev,
      waterMl: Math.max(0, newAmount),
    }));
  };

  const handleAddWaterStep = (delta: number) => {
    handleUpdateWater(dayLog.waterMl + delta);
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

  const openBarcodeForSlot = (slot: MealSlotCategory) => {
    setSelectedSlotForAdd(slot);
    setShowBarcodeModal(true);
  };

  const openNaturalLanguageForSlot = (slot: MealSlotCategory) => {
    setSelectedSlotForAdd(slot);
    setShowNaturalLanguageModal(true);
  };

  const openFoodSearchForSlot = (slot: MealSlotCategory) => {
    setSelectedSlotForAdd(slot);
    setShowFoodModal(true);
  };

  const openAiMealForSlot = (slot: MealSlotCategory) => {
    setSelectedSlotForAdd(slot);
    setShowAiMealModal(true);
  };

  const openQuickMacroForSlot = (slot: MealSlotCategory) => {
    setSelectedSlotForAdd(slot);
    setShowQuickMacroModal(true);
  };

  // Target ratios and percentages
  const targetKcal = dayLog.targetCalories || goal.calories;
  const targetP = dayLog.targetProtein || goal.protein;
  const targetC = dayLog.targetCarbs || goal.carbs;
  const targetF = dayLog.targetFats || goal.fats;
  const targetFiber = dayLog.targetFiber || goal.fiber || 38;
  const targetWater = dayLog.targetWaterMl || goal.waterMl || 3500;

  const calorieDiff = targetKcal - totals.calories;
  const caloriePercent = safePercent(totals.calories, targetKcal);
  const proteinPercent = safePercent(totals.protein, targetP);
  const carbsPercent = safePercent(totals.carbs, targetC);
  const fatsPercent = safePercent(totals.fats, targetF);
  const fiberPercent = Math.min(100, safePercent(totals.fiber, targetFiber));
  const waterPercent = Math.min(100, safePercent(dayLog.waterMl, targetWater));

  const activeSlots = dayLog.customSlots || [];

  return (
    <ProGuard
      title="Modulul Nutriție Sportivă PRO"
      description="Sistem complet de dietetică sportivă pentru hipertrofie și definire. Scaner cod de bare Open Food Facts, mese complet dinamice, calculator metabolic BMR/TDEE, tracker de hidratare și AI Chef Gemini."
      onUpgradeClick={onUpgradeClick}
      badge="PRO LIFETIME"
    >
      <div className="space-y-6 pb-28 animate-in fade-in duration-300 relative select-none">
        {/* ========================================================= */}
        {/* 1. TOP HEADER & DATE SELECTOR                             */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <h1 className="text-xl min-[400px]:text-2xl sm:text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight leading-none break-words">
                DIETETICĂ & NUTRIȚIE
              </h1>
              <span className="shrink-0 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-500 border border-orange-500/30">
                {goal.type === "hypertrophy"
                  ? "Hipertrofie"
                  : goal.type === "cutting"
                  ? "Definire"
                  : "Menținere"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Bilanț caloric precis, inele macro-nutriționale, scanare cod de bare și mese dinamice
            </p>
          </div>

          {/* Date Selector Navigation Pill */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-white/5 self-start sm:self-auto shadow-2xs">
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
                  ? "bg-orange-500 text-black shadow-xs"
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

        {/* ========================================================= */}
        {/* 2. SLEEK HORIZONTAL SCROLLABLE ACTION PILL-MENU (2026 UI)  */}
        {/* ========================================================= */}
        <div className="flex flex-nowrap overflow-x-auto hide-scrollbar scroll-fade-x sm:flex-wrap sm:overflow-visible w-full items-center gap-2 pb-1.5 pt-0.5 -mx-1 px-1 touch-pan-x">
          {/* Barcode Scanner Primary Pill */}
          <button
            type="button"
            onClick={() => {
              if (activeSlots.length > 0 && !activeSlots.includes(selectedSlotForAdd)) {
                setSelectedSlotForAdd(activeSlots[0]);
              }
              setShowBarcodeModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs font-black tracking-wide whitespace-nowrap cursor-pointer transition-all active:scale-95 shadow-xs shrink-0"
          >
            <ScanBarcode className="size-4" />
            <span>Scaner Cod de Bare</span>
          </button>

          {/* Metabolic Wizard */}
          <button
            type="button"
            onClick={() => setShowWizardModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900/90 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200/80 dark:border-white/10 text-xs font-bold whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Calculator className="size-4 text-orange-500" />
            <span>Calculator BMR / TDEE</span>
          </button>

          {/* Gemini AI Meal Scanner */}
          <button
            type="button"
            onClick={() => {
              if (activeSlots.length > 0 && !activeSlots.includes(selectedSlotForAdd)) {
                setSelectedSlotForAdd(activeSlots[0]);
              }
              setShowAiMealModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/25 text-xs font-bold whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Sparkles className="size-4 text-purple-400" />
            <span>AI Meal Chef</span>
          </button>

          {/* AI Text-to-Meal Natural Language Logger */}
          <button
            type="button"
            onClick={() => {
              if (activeSlots.length > 0 && !activeSlots.includes(selectedSlotForAdd)) {
                setSelectedSlotForAdd(activeSlots[0]);
              }
              setShowNaturalLanguageModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 text-xs font-bold whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <MessageSquareText className="size-4 text-indigo-400" />
            <span>Text-to-Meal AI</span>
          </button>

          {/* Weekly Adherence Chart Toggle */}
          <button
            type="button"
            onClick={() => setShowAdherenceChart(!showAdherenceChart)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0 ${
              showAdherenceChart
                ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900/90 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-200/80 dark:border-white/10"
            }`}
          >
            <TrendingUp className="size-4 text-emerald-500" />
            <span>Grafic Aderență 7 Zile</span>
          </button>

          {/* Food Search Database */}
          <button
            type="button"
            onClick={() => {
              const defaultSlot = activeSlots.length > 0 ? activeSlots[0] : "Prânz";
              openFoodSearchForSlot(defaultSlot);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900/90 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200/80 dark:border-white/10 text-xs font-bold whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Apple className="size-4 text-blue-500" />
            <span>Bază 40+ Alimente</span>
          </button>

          {/* Trailing spacer: scroll containers ignore end padding in some browsers */}
          <span aria-hidden="true" className="w-8 h-px shrink-0 sm:hidden" />
        </div>

        <TdeeEngineCard result={dynamicTdee} />

        {/* ========================================================= */}
        {/* OPTIONAL EXPANDABLE ADHERENCE CHART                       */}
        {/* ========================================================= */}
        {showAdherenceChart && (
          <div className="animate-in fade-in duration-300">
            <WeeklyAdherenceChart currentGoal={goal} liveDay={dayLog} />
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. PREMIUM 2026 CIRCULAR MACRO RING DASHBOARD             */}
        {/* ========================================================= */}
        <div className="p-6 sm:p-7 rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-zinc-950 to-black text-white border border-slate-800/80 dark:border-white/10 shadow-2xl relative overflow-hidden">
          {/* Subtle background ambient glow */}
          <div className="absolute -top-24 -right-24 size-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 size-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            {/* LEFT / CENTER: HERO CALORIE RING GAUGE */}
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              <CircularRing
                radius={75}
                strokeWidth={12}
                progress={caloriePercent}
                strokeColor="stroke-orange-500"
                trackColor="stroke-zinc-800/80"
                className="drop-shadow-[0_0_12px_rgba(249,115,22,0.25)]"
              >
                <Flame className="size-5 text-orange-500 animate-pulse mb-0.5" />
                <span className="text-2xl font-black text-white tracking-tight leading-none">
                  {totals.calories}
                </span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
                  kcal
                </span>
              </CircularRing>

              {/* Calorie Stats Breakdown */}
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Bilanț Caloric Zilnic
                </span>
                <div className="flex items-baseline justify-center sm:justify-start gap-1.5">
                  <span className="text-3xl font-black text-white tracking-tight">
                    {totals.calories}
                  </span>
                  <span className="text-sm font-semibold text-zinc-400">
                    / {targetKcal} kcal
                  </span>
                </div>

                <div className="pt-1.5 flex items-center justify-center sm:justify-start gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black ${
                      calorieDiff >= 0
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    <Flame className="size-3" />
                    {calorieDiff >= 0 ? `${calorieDiff} kcal rămase` : `${Math.abs(calorieDiff)} kcal surplus`}
                  </span>
                  <span className="text-xs font-bold text-zinc-500">
                    ({caloriePercent}%)
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT: 3 CIRCULAR MACRO RINGS (PROTEIN, CARBS, FATS) */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-6 lg:pt-0 border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-8">
              {/* Protein Ring */}
              <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
                <CircularRing
                  radius={38}
                  strokeWidth={6}
                  progress={proteinPercent}
                  strokeColor="stroke-blue-500"
                  trackColor="stroke-zinc-800"
                  className="drop-shadow-[0_0_8px_rgba(59,130,246,0.3)] mb-2"
                >
                  <span className="text-xs font-black text-white">{proteinPercent}%</span>
                </CircularRing>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                  Proteine
                </span>
                <p className="text-sm font-black text-white mt-0.5">
                  {totals.protein}g
                </p>
                <p className="text-[10px] text-zinc-400 font-medium">
                  din {targetP}g
                </p>
              </div>

              {/* Carbs Ring */}
              <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
                <CircularRing
                  radius={38}
                  strokeWidth={6}
                  progress={carbsPercent}
                  strokeColor="stroke-amber-500"
                  trackColor="stroke-zinc-800"
                  className="drop-shadow-[0_0_8px_rgba(245,158,11,0.3)] mb-2"
                >
                  <span className="text-xs font-black text-white">{carbsPercent}%</span>
                </CircularRing>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Carbohidrați
                </span>
                <p className="text-sm font-black text-white mt-0.5">
                  {totals.carbs}g
                </p>
                <p className="text-[10px] text-zinc-400 font-medium">
                  din {targetC}g
                </p>
              </div>

              {/* Fats Ring */}
              <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
                <CircularRing
                  radius={38}
                  strokeWidth={6}
                  progress={fatsPercent}
                  strokeColor="stroke-rose-500"
                  trackColor="stroke-zinc-800"
                  className="drop-shadow-[0_0_8px_rgba(244,63,94,0.3)] mb-2"
                >
                  <span className="text-xs font-black text-white">{fatsPercent}%</span>
                </CircularRing>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                  Grăsimi
                </span>
                <p className="text-sm font-black text-white mt-0.5">
                  {totals.fats}g
                </p>
                <p className="text-[10px] text-zinc-400 font-medium">
                  din {targetF}g
                </p>
              </div>
            </div>
          </div>

          {/* BOTTOM TILE: FIBER & SODIUM PROGRESS */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 w-full flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 shrink-0">
                Fibre: {totals.fiber}g / {targetFiber}g
              </span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${fiberPercent}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-zinc-400 shrink-0">
                {fiberPercent}%
              </span>
            </div>

            {totals.sodium > 0 && (
              <span className="text-[10px] font-semibold text-zinc-400">
                Sodiu: <strong className="text-zinc-200">{totals.sodium} mg</strong>
              </span>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. INLINE QUICK-ADD HYDRATION TRACKER (ZERO MODAL NEEDED) */}
        {/* ========================================================= */}
        <div className="p-5 rounded-[2rem] bg-gradient-to-r from-blue-950/30 via-slate-900/80 to-cyan-950/30 dark:bg-zinc-900/90 border border-blue-500/20 dark:border-white/5 shadow-md backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 shrink-0">
                <Droplets className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                    Hidratare Rapidă
                  </h3>
                  {dayLog.waterMl >= targetWater && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      <Check className="size-2.5" /> Țintă Atinsă
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  <strong className="text-blue-600 dark:text-blue-400 font-black">{dayLog.waterMl} ml</strong> / {targetWater} ml zilnic ({waterPercent}%)
                </p>
              </div>
            </div>

            {/* Quick 1-Tap Add Buttons */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => handleAddWaterStep(250)}
                className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-black tracking-wide cursor-pointer transition-all active:scale-95"
              >
                +250 ml
              </button>
              <button
                type="button"
                onClick={() => handleAddWaterStep(500)}
                className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-black tracking-wide cursor-pointer transition-all active:scale-95"
              >
                +500 ml
              </button>
              <button
                type="button"
                onClick={() => handleAddWaterStep(750)}
                className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-black tracking-wide cursor-pointer transition-all active:scale-95"
              >
                +750 ml
              </button>
              {dayLog.waterMl > 0 && (
                <button
                  type="button"
                  onClick={() => handleUpdateWater(0)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                  title="Resetează apa pe azi"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Fluid Water Level Progress Bar */}
          <div className="w-full h-2 bg-slate-200/80 dark:bg-zinc-800 rounded-full overflow-hidden mt-3 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${waterPercent}%` }}
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. COMPLETELY DYNAMIC MEALS SECTION (2026 ARCHITECTURE)   */}
        {/* ========================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                MESE PERSONALIZATE & DINAMICE
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Organizează orice categorie de masă conform programului tău zilnic
              </p>
            </div>
          </div>

          {/* Empty State when customSlots is empty */}
          {activeSlots.length === 0 ? (
            <div className="p-8 sm:p-10 rounded-[2rem] border-2 border-dashed border-slate-300 dark:border-zinc-800 text-center space-y-3 bg-slate-50/50 dark:bg-zinc-900/30">
              <div className="p-3.5 rounded-2xl bg-orange-500/10 text-orange-500 w-fit mx-auto border border-orange-500/20">
                <Utensils className="size-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                  Nicio masă adăugată. Creează prima ta masă mai jos.
                </p>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 max-w-sm mx-auto">
                  Adaugă sloturi personalizate precum "Mic Dejun", "Prânz", "Post-Workout" sau "Gustare Ora 15:00".
                </p>
              </div>
            </div>
          ) : (
            /* Dynamic mapping over dayLog.customSlots */
            <div className="space-y-3">
              {activeSlots.map((slotName) => {
                const Icon = getSlotIcon(slotName);
                const isCollapsed = !!collapsedSlots[slotName];

                // Filter meals for this exact custom slot name
                const slotMeals = dayLog.meals.filter(
                  (m) =>
                    m.category === slotName ||
                    (m.category && m.category.toLowerCase() === slotName.toLowerCase())
                );

                const slotKcal = slotMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
                const slotProtein = slotMeals.reduce((sum, m) => sum + (m.protein || 0), 0);

                return (
                  <div
                    key={slotName}
                    className="rounded-[2rem] bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/5 shadow-xs overflow-hidden transition-all"
                  >
                    {/* Slot Header */}
                    <div
                      onClick={() => toggleSlotCollapse(slotName)}
                      className="p-4 sm:p-4.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 shrink-0">
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                              {slotName}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                              {slotMeals.length} {slotMeals.length === 1 ? "aliment" : "alimente"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                            Masă dinamică configurată
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                            {Math.round(slotKcal)} <span className="text-xs font-normal text-slate-400">kcal</span>
                          </p>
                          <p className="text-xs font-black text-blue-600 dark:text-blue-400">
                            {Math.round(slotProtein)}g <span className="text-[10px] font-normal text-slate-400">P</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (slotMeals.length > 0) {
                                if (confirm(`Ești sigur că vrei să elimini masa "${slotName}"?`)) {
                                  handleRemoveSlot(slotName);
                                }
                              } else {
                                handleRemoveSlot(slotName);
                              }
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Șterge acest slot de masă"
                          >
                            <Trash2 className="size-4" />
                          </button>

                          <div className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white">
                            {isCollapsed ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Slot Expanded Content */}
                    {!isCollapsed && (
                      <div className="px-4 sm:px-4.5 pb-4.5 pt-1 border-t border-slate-100 dark:border-white/5 space-y-3">
                        {/* Logged foods list */}
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
                                    {item.barcode && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono">
                                        Scanat
                                      </span>
                                    )}
                                    {item.time && (
                                      <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                                        {item.time}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                    <span><strong>{item.calories}</strong> kcal</span>
                                    <span>P: <strong className="text-blue-600 dark:text-blue-400">{item.protein}g</strong></span>
                                    <span>C: <strong>{item.carbs}g</strong></span>
                                    <span>G: <strong>{item.fats}g</strong></span>
                                    {item.fiber ? <span>F: <strong>{item.fiber}g</strong></span> : null}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveMealItem(item.id)}
                                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                                  title="Șterge aliment"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-zinc-500 italic py-1">
                            Niciun aliment adăugat încă în {slotName}.
                          </p>
                        )}

                        {/* Copy feedback notification banner */}
                        {copyFeedback && copyFeedback.slot === slotName && (
                          <div
                            className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
                              copyFeedback.success
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            <Check className="size-3.5 shrink-0" />
                            <span>{copyFeedback.text}</span>
                          </div>
                        )}

                        {/* Quick-Action Trigger Buttons for this Slot */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          {/* Barcode Scanner Direct Trigger */}
                          <button
                            type="button"
                            onClick={() => openBarcodeForSlot(slotName)}
                            className="flex-1 min-w-[110px] py-2 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
                          >
                            <ScanBarcode className="size-3.5" />
                            <span>Scanează</span>
                          </button>

                          {/* Search Food Database */}
                          <button
                            type="button"
                            onClick={() => openFoodSearchForSlot(slotName)}
                            className="flex-1 min-w-[110px] py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-white/5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
                          >
                            <Plus className="size-3.5" />
                            <span>Caută Aliment</span>
                          </button>

                          {/* 2026 FEATURE: Quick Add Macros Button */}
                          <button
                            type="button"
                            onClick={() => openQuickMacroForSlot(slotName)}
                            className="py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shrink-0"
                            title="Adăugare rapidă calorii și macronutrienți brut"
                          >
                            <Zap className="size-3.5 text-amber-500" />
                            <span>Quick Macros</span>
                          </button>

                          {/* Natural Language Text AI */}
                          <button
                            type="button"
                            onClick={() => openNaturalLanguageForSlot(slotName)}
                            className="py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shrink-0"
                            title="Adaugă masă prin limbaj natural AI"
                          >
                            <MessageSquareText className="size-3.5" />
                            <span className="hidden sm:inline">Text AI</span>
                          </button>

                          {/* AI Chef Gemini */}
                          <button
                            type="button"
                            onClick={() => openAiMealForSlot(slotName)}
                            className="py-2 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-600 dark:text-purple-400 text-xs font-black flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shrink-0"
                            title="Generează masă cu AI Chef"
                          >
                            <Sparkles className="size-3.5" />
                            <span className="hidden sm:inline">AI Chef</span>
                          </button>

                          {/* Smart Copy: Copy Yesterday's Meal */}
                          <button
                            type="button"
                            onClick={() => handleCopyFromYesterday(slotName)}
                            className="w-full sm:w-auto py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-white/5 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
                            title="Copiază alimentele din aceeași masă din ziua anterioară"
                          >
                            <Copy className="size-3 text-orange-500" />
                            <span>Copiază din ziua anterioară</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================= */}
          {/* BOTTOM UI: CREATE NEW CUSTOM MEAL SLOT (REQUIREMENT 3)    */}
          {/* ========================================================= */}
          <div className="p-4 sm:p-5 rounded-[2rem] bg-slate-100/80 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="size-4 text-orange-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Creează o Masă Nouă
                </span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold">
                {activeSlots.length} {activeSlots.length === 1 ? "masă activă" : "mese active"}
              </span>
            </div>

            <form onSubmit={handleAddNewSlot} className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={newSlotName}
                onChange={(e) => setNewSlotName(e.target.value)}
                placeholder='ex: "Post-Workout", "Gustare Ora 15:00", "Mic Dejun"...'
                className="w-full sm:flex-1 h-11 px-4 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!newSlotName.trim()}
                className="w-full sm:w-auto h-11 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm shrink-0"
              >
                <Plus className="size-4 stroke-[3]" />
                <span>Adăugare Masă</span>
              </button>
            </form>

            {/* Quick Suggestions for 1-tap addition */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                Presetări rapide:
              </span>
              {["Mic Dejun", "Prânz", "Pre-Workout", "Post-Workout", "Cină", "Gustare"].map((preset) => {
                const alreadyExists = activeSlots.some((s) => s.toLowerCase() === preset.toLowerCase());
                if (alreadyExists) return null;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddPresetSlot(preset)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-white/5 hover:border-orange-500/40 text-[11px] font-semibold text-slate-700 dark:text-zinc-300 hover:text-orange-500 cursor-pointer transition-all shrink-0"
                  >
                    + {preset}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 6. GORGEOUS FLOATING ACTION BUTTON (FAB) FOR BARCODE SCAN */}
        {/* ========================================================= */}
        <div className="fixed bottom-20 right-5 z-40 sm:bottom-24 sm:right-8">
          <button
            type="button"
            onClick={() => {
              if (activeSlots.length > 0 && !activeSlots.includes(selectedSlotForAdd)) {
                setSelectedSlotForAdd(activeSlots[0]);
              }
              setShowBarcodeModal(true);
            }}
            className="flex items-center gap-2.5 px-4.5 py-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-2xl shadow-orange-500/40 border border-white/20 active:scale-95 transition-all cursor-pointer group"
          >
            <div className="p-1 rounded-full bg-black/15 group-hover:rotate-12 transition-transform">
              <ScanBarcode className="size-5 stroke-[2.5]" />
            </div>
            <span className="hidden sm:inline">Scanează Cod</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* 7. MODALS                                                 */}
        {/* ========================================================= */}
        {/* Barcode Scanner Modal with Dynamic Available Slots */}
        <BarcodeScannerModal
          isOpen={showBarcodeModal}
          onClose={() => setShowBarcodeModal(false)}
          defaultSlot={selectedSlotForAdd}
          availableSlots={activeSlots}
          onAddMealItem={handleAddMealItem}
        />

        {/* Quick Add Macros Modal (2026 Feature) */}
        <QuickMacroModal
          isOpen={showQuickMacroModal}
          onClose={() => setShowQuickMacroModal(false)}
          targetSlot={selectedSlotForAdd}
          onAddMealItem={handleAddMealItem}
        />

        {/* Natural Language Meal Modal (AI Text-to-Meal) */}
        <NaturalLanguageModal
          isOpen={showNaturalLanguageModal}
          onClose={() => setShowNaturalLanguageModal(false)}
          defaultSlot={selectedSlotForAdd}
          availableSlots={activeSlots}
          onAddMealItems={handleAddBulkMealItems}
        />

        {/* Food Search Modal */}
        <FoodSearchModal
          isOpen={showFoodModal}
          onClose={() => setShowFoodModal(false)}
          defaultCategory={selectedSlotForAdd}
          onAddMealItem={handleAddMealItem}
        />

        {/* Metabolic Profile Wizard Modal */}
        <MetabolicWizardModal
          isOpen={showWizardModal}
          onClose={() => setShowWizardModal(false)}
          currentGoal={goal}
          onApplyGoal={handleApplyNewGoal}
        />

        {/* AI Meal Chef Gemini Modal */}
        <AiMealModal
          isOpen={showAiMealModal}
          onClose={() => setShowAiMealModal(false)}
          defaultCategory={selectedSlotForAdd}
          onAddMealItem={handleAddMealItem}
          onAddMealItems={handleAddBulkMealItems}
          targetCalories={goal.calories}
          targetProtein={goal.protein}
        />
      </div>
    </ProGuard>
  );
};
