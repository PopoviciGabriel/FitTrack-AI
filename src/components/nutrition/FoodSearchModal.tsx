import React, { useState, useMemo } from "react";
import { 
  Search, 
  X, 
  Plus, 
  Flame, 
  Dumbbell, 
  Scale, 
  Check, 
  Sparkles, 
  ChevronRight,
  Filter,
  ArrowLeft
} from "lucide-react";
import { FoodCategory, FoodItem, MacroMealItem, MealSlotCategory } from "../../types";
import { searchFoodsOffline, warmUpFoodIndex } from "../../services/foodSearchService";

const SEARCH_DEBOUNCE_MS = 200;

interface FoodSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory: MealSlotCategory;
  onAddMealItem: (item: MacroMealItem) => void;
}

const CATEGORY_NAMES: Record<MealSlotCategory, string> = {
  mic_dejun: "Mic Dejun",
  pranz: "Prânz",
  pre_workout: "Pre-Workout",
  post_workout: "Post-Workout",
  cina: "Cină",
  gustari: "Gustări",
};

export const FoodSearchModal: React.FC<FoodSearchModalProps> = ({
  isOpen,
  onClose,
  defaultCategory,
  onAddMealItem,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("Toate");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [targetSlot, setTargetSlot] = useState<MealSlotCategory>(defaultCategory);
  const [grams, setGrams] = useState<number>(100);
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Custom food fields
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFats, setCustomFats] = useState("");
  const [customFiber, setCustomFiber] = useState("");

  // Sync targetSlot when defaultCategory changes
  React.useEffect(() => {
    setTargetSlot(defaultCategory);
  }, [defaultCategory]);

  // Set default grams when selecting food
  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setGrams(food.defaultPortion || 100);
  };

  // Build the offline search index once, off the first keystroke's critical path
  React.useEffect(() => {
    warmUpFoodIndex();
  }, []);

  // Debounce typing so the list updates once the user pauses
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedTerm("");
  };

  // Fuzzy, fully offline search; results are computed synchronously
  const filteredFoods = useMemo(
    () =>
      searchFoodsOffline(debouncedTerm, {
        category:
          selectedCategoryFilter === "Toate" ? undefined : (selectedCategoryFilter as FoodCategory),
      }),
    [debouncedTerm, selectedCategoryFilter]
  );

  // Computed values for selected food
  const computedMacros = useMemo(() => {
    if (!selectedFood) return { kcal: 0, p: 0, c: 0, f: 0, fiber: 0, sod: 0 };
    const factor = grams / 100;
    return {
      kcal: Math.round(selectedFood.calories * factor),
      p: Number((selectedFood.protein * factor).toFixed(1)),
      c: Number((selectedFood.carbs * factor).toFixed(1)),
      f: Number((selectedFood.fats * factor).toFixed(1)),
      fiber: Number((selectedFood.fiber * factor).toFixed(1)),
      sod: Math.round((selectedFood.sodium || 0) * factor),
    };
  }, [selectedFood, grams]);

  const handleConfirmAdd = () => {
    if (!selectedFood) return;
    const newItem: MacroMealItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: `${selectedFood.name} (${grams}g)`,
      category: targetSlot,
      grams,
      calories: computedMacros.kcal,
      protein: computedMacros.p,
      carbs: computedMacros.c,
      fats: computedMacros.f,
      fiber: computedMacros.fiber,
      sodium: computedMacros.sod,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    onAddMealItem(newItem);
    setSelectedFood(null);
    onClose();
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newItem: MacroMealItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: customName.trim(),
      category: targetSlot,
      grams: 100,
      calories: parseFloat(customCalories) || 0,
      protein: parseFloat(customProtein) || 0,
      carbs: parseFloat(customCarbs) || 0,
      fats: parseFloat(customFats) || 0,
      fiber: parseFloat(customFiber) || 0,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    onAddMealItem(newItem);
    setCustomName("");
    setCustomCalories("");
    setCustomProtein("");
    setCustomCarbs("");
    setCustomFats("");
    setCustomFiber("");
    setIsCustomMode(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-zinc-950 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="relative p-5 pb-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedFood ? (
              <button
                type="button"
                onClick={() => setSelectedFood(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                title="Înapoi la căutare"
              >
                <ArrowLeft className="size-4" />
              </button>
            ) : (
              <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500">
                <Dumbbell className="size-5" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {selectedFood ? "Calculează Porția" : isCustomMode ? "Aliment Personalizat" : "Bază de Date Alimentară"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Destinație: <span className="font-bold text-orange-500">{CATEGORY_NAMES[targetSlot]}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!selectedFood && (
              <button
                type="button"
                onClick={() => setIsCustomMode(!isCustomMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isCustomMode
                    ? "bg-orange-500 text-black"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200"
                }`}
              >
                {isCustomMode ? "Vezi Baza de Date" : "+ Manual"}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Target Meal Slot Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1.5">
              Adaugă în Masa:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {(Object.keys(CATEGORY_NAMES) as MealSlotCategory[]).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTargetSlot(slot)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold text-center truncate cursor-pointer transition-all ${
                    targetSlot === slot
                      ? "bg-orange-500 text-black shadow-md font-black"
                      : "bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  {CATEGORY_NAMES[slot]}
                </button>
              ))}
            </div>
          </div>

          {/* VIEW 1: PORTION CALCULATOR FOR SELECTED FOOD */}
          {selectedFood ? (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                  {selectedFood.category}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {selectedFood.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Valori de referință la 100g: {selectedFood.calories} kcal | {selectedFood.protein}g P | {selectedFood.carbs}g C | {selectedFood.fats}g G
                </p>
              </div>

              {/* Grams Selector & Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Cantitate / Porție:
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={5}
                      max={1000}
                      value={grams}
                      onChange={(e) => setGrams(Math.max(1, parseInt(e.target.value, 10) || 0))}
                      className="w-20 text-center py-1 px-2 font-mono font-black text-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                    />
                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">g</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={10}
                  max={500}
                  step={5}
                  value={grams}
                  onChange={(e) => setGrams(parseInt(e.target.value, 10))}
                  className="w-full accent-orange-500 cursor-pointer h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg"
                />

                {/* Quick Gram Preset Pills */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {[30, 50, 80, 100, 150, 200, 250, 300].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setGrams(preset)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        grams === preset
                          ? "bg-orange-500 text-black font-black"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {preset}g
                    </button>
                  ))}
                </div>
              </div>

              {/* Reactive Macros Output Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-500">
                    Calorii
                  </span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {computedMacros.kcal}
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">kcal</span>
                </div>

                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-500">
                    Proteine
                  </span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {computedMacros.p}g
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">esențial</span>
                </div>

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                    Carbohidrați
                  </span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {computedMacros.c}g
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">energie</span>
                </div>

                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                    Grăsimi
                  </span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {computedMacros.f}g
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">hormoni</span>
                </div>
              </div>

              {/* Extra micronutrients info */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-900 text-xs text-slate-500 dark:text-zinc-400">
                <span>Fibre dietetice: <strong className="text-slate-700 dark:text-zinc-200">{computedMacros.fiber}g</strong></span>
                <span>Sodiu: <strong className="text-slate-700 dark:text-zinc-200">{computedMacros.sod}mg</strong></span>
              </div>

              <button
                type="button"
                onClick={handleConfirmAdd}
                className="w-full py-3.5 px-5 bg-orange-500 hover:bg-orange-600 text-black font-black text-sm tracking-wide uppercase rounded-2xl shadow-lg shadow-orange-500/20 cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="size-4 stroke-[3]" />
                Adaugă {grams}g în {CATEGORY_NAMES[targetSlot] || targetSlot}
              </button>
            </div>
          ) : isCustomMode ? (
            /* VIEW 2: MANUAL CUSTOM MEAL FORM */
            <form onSubmit={handleAddCustom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Nume Aliment / Rețetă *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Bol cu cartofi și brânză cottage"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1">
                    Calorii (kcal) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="ex: 450"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1">
                    Proteine (g) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="ex: 35"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1">
                    Carbohidrați (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="ex: 50"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1">
                    Grăsimi (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="ex: 12"
                    value={customFats}
                    onChange={(e) => setCustomFats(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1">
                  Fibre dietetice (opțional - g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="ex: 6"
                  value={customFiber}
                  onChange={(e) => setCustomFiber(e.target.value)}
                  className="w-full max-w-xs bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-5 bg-orange-500 hover:bg-orange-600 text-black font-black text-sm tracking-wide uppercase rounded-2xl shadow-lg shadow-orange-500/20 cursor-pointer active:scale-98 transition-all"
              >
                Salvează Aliment în {CATEGORY_NAMES[targetSlot] || targetSlot}
              </button>
            </form>
          ) : (
            /* VIEW 3: SEARCHABLE BODYBUILDING FOOD DATABASE */
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Caută aliment (pui, vită, ovăz, orez, whey, ouă...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  "Toate",
                  "Proteine",
                  "Carbohidrați Complecși",
                  "Grăsimi Sănătoase",
                  "Lactate & Shake-uri",
                  "Legume & Fructe",
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap font-bold transition-all cursor-pointer ${
                      selectedCategoryFilter === cat
                        ? "bg-slate-900 text-white dark:bg-white dark:text-black"
                        : "bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* List of 40+ Bodybuilding Foods */}
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredFoods.map((food) => (
                  <div
                    key={food.id}
                    onClick={() => handleSelectFood(food)}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/70 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-orange-500 transition-colors">
                          {food.name}
                        </h4>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                          {food.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                        <span><strong>{food.calories}</strong> kcal</span>
                        <span>P: <strong className="text-blue-500">{food.protein}g</strong></span>
                        <span>C: <strong>{food.carbs}g</strong></span>
                        <span>G: <strong>{food.fats}g</strong></span>
                        {food.fiber > 0 && <span>F: <strong>{food.fiber}g</strong></span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 hidden sm:inline">
                        porție: {food.defaultPortion}g
                      </span>
                      <div className="p-1.5 rounded-xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-all">
                        <Plus className="size-4" />
                      </div>
                    </div>
                  </div>
                ))}

                {filteredFoods.length === 0 && (
                  <div className="text-center py-8 text-slate-400 dark:text-zinc-600">
                    <p className="text-sm">Nu s-a găsit niciun aliment pentru „{debouncedTerm}”.</p>
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(true)}
                      className="mt-2 text-xs text-orange-500 font-bold hover:underline"
                    >
                      Adaugă-l manual ca aliment personalizat →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
