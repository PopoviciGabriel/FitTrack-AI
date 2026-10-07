import React, { useState } from "react";
import { 
  Sparkles, 
  X, 
  ChefHat, 
  Clock, 
  Flame, 
  Plus, 
  Check, 
  RotateCcw,
  Utensils,
  Lightbulb
} from "lucide-react";
import { AiMealSuggestion, MacroMealItem, MealSlotCategory, NutritionEngineMeta } from "../../types";
import { generateNutritionSuggestion, hasActiveGeminiKey, parseNaturalLanguageMeal } from "../../services/geminiService";
import { countExplicitFoods } from "../../services/foodSearchService";
import { EngineModeBadge, EngineResultBadge } from "./NutritionEngineBadge";

interface AiMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory: MealSlotCategory;
  onAddMealItem: (item: MacroMealItem) => void;
  onAddMealItems: (items: MacroMealItem[]) => void;
  targetCalories?: number;
  targetProtein?: number;
}

const CATEGORY_NAMES: Record<MealSlotCategory, string> = {
  mic_dejun: "Mic Dejun",
  pranz: "Prânz",
  pre_workout: "Pre-Workout",
  post_workout: "Post-Workout",
  cina: "Cină",
  gustari: "Gustări",
};

const QUICK_PROMPTS = [
  "Am în frigider: 250g piept de pui, orez basmati, broccoli și ulei de măsline.",
  "Mic dejun anabolic rapid cu ovăz, ouă, unt de arahide și fructe.",
  "Shake post-workout de 500 kcal cu whey, banană și carbohidrați complecși.",
  "Cină cu vită sau somon, cartofi dulci și legume verzi pentru refacere.",
];

export const AiMealModal: React.FC<AiMealModalProps> = ({
  isOpen,
  onClose,
  defaultCategory,
  onAddMealItem,
  onAddMealItems,
  targetCalories,
  targetProtein,
}) => {
  const [query, setQuery] = useState("");
  const [slot, setSlot] = useState<MealSlotCategory>(defaultCategory);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AiMealSuggestion | null>(null);
  const [identifiedFoods, setIdentifiedFoods] = useState<MacroMealItem[]>([]);
  const [unrecognized, setUnrecognized] = useState<string[]>([]);
  const [engine, setEngine] = useState<NutritionEngineMeta | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const advancedMode = React.useMemo(() => isOpen && hasActiveGeminiKey(), [isOpen]);

  React.useEffect(() => {
    setSlot(defaultCategory);
  }, [defaultCategory]);

  const handleGenerate = async (promptText?: string) => {
    const textToUse = promptText || query;
    if (!textToUse.trim()) return;

    setIsLoading(true);
    setSuggestion(null);
    setIdentifiedFoods([]);
    setUnrecognized([]);
    setEngine(null);
    setInfoMsg(null);

    try {
      // A list of weighed foods ("60g pui, 25g cașcaval, 55g pâine") is itemised, not turned into a single recipe.
      if (countExplicitFoods(textToUse) >= 2) {
        const analysis = await parseNaturalLanguageMeal(textToUse.trim(), slot);
        setEngine(analysis.engine);
        setUnrecognized(analysis.unrecognized);
        if (analysis.items.length > 0) {
          setIdentifiedFoods(analysis.items);
          return;
        }
      }

      const result = await generateNutritionSuggestion(
        textToUse.trim(),
        slot,
        targetCalories ? Math.round(targetCalories / 4) : undefined,
        targetProtein ? Math.round(targetProtein / 4) : undefined
      );
      setSuggestion(result.suggestion);
      setEngine(result.engine);
      setUnrecognized([]);
    } catch (e: unknown) {
      console.error("Meal generation error:", e);
      setInfoMsg("Nu am putut procesa cererea. Încearcă din nou sau reformulează cu alimente și gramaje.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddIdentifiedFoods = () => {
    if (identifiedFoods.length === 0) return;
    onAddMealItems(identifiedFoods.map((food) => ({ ...food, category: slot })));
    onClose();
  };

  const identifiedTotals = identifiedFoods.reduce(
    (acc, food) => ({
      calories: acc.calories + food.calories,
      protein: acc.protein + food.protein,
      carbs: acc.carbs + food.carbs,
      fats: acc.fats + food.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const handleAddSuggestedMeal = () => {
    if (!suggestion) return;

    const newItem: MacroMealItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: suggestion.name,
      category: slot,
      grams: 350,
      calories: suggestion.calories,
      protein: suggestion.protein,
      carbs: suggestion.carbs,
      fats: suggestion.fats,
      fiber: suggestion.fiber,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    onAddMealItem(newItem);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-zinc-950 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-orange-500/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex flex-wrap items-center gap-2">
                AI Nutrition Scanner & Chef
                <EngineModeBadge advanced={advancedMode} />
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Spune ce alimente ai sau ce dorești, iar FitTrack calculează macro-urile exacte
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Target Slot Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1.5">
              Destinație Masă:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {(Object.keys(CATEGORY_NAMES) as MealSlotCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSlot(cat)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold text-center truncate cursor-pointer transition-all ${
                    slot === cat
                      ? "bg-purple-600 text-white shadow-md font-black"
                      : "bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  {CATEGORY_NAMES[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* User Prompt Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
              Ce alimente ai la dispoziție sau ce rețetă dorești?
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Exemplu: Am 200g piept de curcan, cartofi albi, ceapă, salată verde și ulei de măsline. Sugerează o masă rapidă cu peste 45g proteine."
                className="w-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Quick suggestions pills */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 block mb-1.5">
              Exemple rapide de analizat:
            </span>
            <div className="flex flex-col gap-1.5">
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(p);
                    handleGenerate(p);
                  }}
                  className="text-left text-xs p-2 rounded-xl bg-slate-50 dark:bg-zinc-900/60 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-zinc-300 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Lightbulb className="size-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">{p}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading || !query.trim()}
            onClick={() => handleGenerate()}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white font-black text-sm tracking-wide uppercase rounded-2xl shadow-lg shadow-purple-500/20 disabled:opacity-50 cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{advancedMode ? "Analizez & Calculez cu Gemini..." : "Calculez macro-urile..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>Generează Rețetă & Macros</span>
              </>
            )}
          </button>

          {infoMsg && !isLoading && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold">
              {infoMsg}
            </div>
          )}

          {/* SKELETON LOADING STATE */}
          {isLoading && (
            <div className="p-5 rounded-3xl bg-slate-100 dark:bg-zinc-900 animate-pulse space-y-3">
              <div className="h-5 bg-slate-300 dark:bg-zinc-800 rounded-lg w-2/3" />
              <div className="h-3 bg-slate-300 dark:bg-zinc-800 rounded-lg w-full" />
              <div className="grid grid-cols-4 gap-2 pt-2">
                <div className="h-16 bg-slate-300 dark:bg-zinc-800 rounded-2xl" />
                <div className="h-16 bg-slate-300 dark:bg-zinc-800 rounded-2xl" />
                <div className="h-16 bg-slate-300 dark:bg-zinc-800 rounded-2xl" />
                <div className="h-16 bg-slate-300 dark:bg-zinc-800 rounded-2xl" />
              </div>
            </div>
          )}

          {/* ALL FOODS IDENTIFIED IN THE TEXT */}
          {identifiedFoods.length > 0 && !isLoading && (
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-zinc-900 border border-purple-500/30 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                    Alimente Identificate ({identifiedFoods.length})
                  </span>
                  {engine && <EngineResultBadge engine={engine} />}
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Fiecare aliment menționat a fost extras separat, cu macro-urile lui.
                </p>
              </div>

              {unrecognized.length > 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400/90">
                  Nu am recunoscut: {unrecognized.join(", ")}. Le poți adăuga din Căutarea de alimente.
                </p>
              )}

              <ul className="space-y-2">
                {identifiedFoods.map((food) => (
                  <li
                    key={food.id}
                    className="p-3 rounded-2xl bg-white dark:bg-zinc-950/60 border border-slate-200 dark:border-white/5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{food.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        P {food.protein}g · C {food.carbs}g · G {food.fats}g
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-black text-orange-500">{food.calories} kcal</span>
                  </li>
                ))}
              </ul>

              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Total</span>
                <span className="text-xs font-black text-slate-900 dark:text-white text-right">
                  {Math.round(identifiedTotals.calories)} kcal · P {Math.round(identifiedTotals.protein)}g · C{" "}
                  {Math.round(identifiedTotals.carbs)}g · G {Math.round(identifiedTotals.fats)}g
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddIdentifiedFoods}
                className="w-full py-3 px-5 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm tracking-wide uppercase rounded-2xl shadow-lg shadow-purple-600/20 cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="size-4 stroke-[3]" />
                Adaugă {identifiedFoods.length} alimente în {CATEGORY_NAMES[slot] || slot}
              </button>
            </div>
          )}

          {/* GENERATED MEAL RESULT */}
          {suggestion && !isLoading && (
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-zinc-900 border border-purple-500/30 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                      Rețetă Optimizată Hypertrophy
                    </span>
                    {engine && <EngineResultBadge engine={engine} />}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {suggestion.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    {suggestion.description}
                  </p>
                </div>
                {suggestion.prepTimeMin && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 shrink-0">
                    <Clock className="size-3 text-orange-500" /> {suggestion.prepTimeMin} min
                  </span>
                )}
              </div>

              {/* Exact Macros Result Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-500">Calorii</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{suggestion.calories}</p>
                  <span className="text-[9px] text-slate-400 dark:text-zinc-500">kcal</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-500">Proteine</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{suggestion.protein}g</p>
                  <span className="text-[9px] text-slate-400 dark:text-zinc-500">anabolic</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Carbi</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{suggestion.carbs}g</p>
                  <span className="text-[9px] text-slate-400 dark:text-zinc-500">glicogen</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">Grăsimi</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{suggestion.fats}g</p>
                  <span className="text-[9px] text-slate-400 dark:text-zinc-500">Fibre: {suggestion.fiber}g</span>
                </div>
              </div>

              {/* Ingredients */}
              {suggestion.ingredients && suggestion.ingredients.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Utensils className="size-3.5 text-purple-400" /> Ingrediente Cântărite:
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-zinc-300">
                    {suggestion.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-purple-500" />
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preparation Steps */}
              {suggestion.instructions && suggestion.instructions.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <ChefHat className="size-3.5 text-orange-400" /> Mod de Preparare:
                  </h4>
                  <ol className="space-y-1 text-xs text-slate-600 dark:text-zinc-400 list-decimal list-inside">
                    {suggestion.instructions.map((step, i) => (
                      <li key={i} className="leading-relaxed">
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddSuggestedMeal}
                className="w-full py-3 px-5 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm tracking-wide uppercase rounded-2xl shadow-lg shadow-purple-600/20 cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="size-4 stroke-[3]" />
                Adaugă în {CATEGORY_NAMES[slot] || slot} ({suggestion.calories} kcal)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
