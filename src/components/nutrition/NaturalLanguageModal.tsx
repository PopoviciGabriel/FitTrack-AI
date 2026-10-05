import React, { useState } from "react";
import {
  X,
  Sparkles,
  MessageSquareText,
  Send,
  Check,
  Trash2,
  AlertCircle,
  Plus,
  Flame,
  ArrowRight,
  RotateCcw,
  Utensils
} from "lucide-react";
import { MacroMealItem, MealSlotCategory } from "../../types";
import { AiApiError, AiUnavailableError, parseNaturalLanguageMeal } from "../../services/geminiService";

interface NaturalLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSlot: MealSlotCategory;
  availableSlots?: string[];
  onAddMealItems: (items: MacroMealItem[]) => void;
}

const MEAL_SLOT_OPTIONS: { key: MealSlotCategory; label: string }[] = [
  { key: "mic_dejun", label: "Mic Dejun" },
  { key: "pranz", label: "Prânz" },
  { key: "pre_workout", label: "Pre-Workout" },
  { key: "post_workout", label: "Post-Workout" },
  { key: "cina", label: "Cină" },
  { key: "gustari", label: "Gustări" },
];

const EXAMPLE_PROMPTS = [
  "200g piept de pui la grătar cu 150g orez și o lingură de ulei de măsline",
  "3 ouă fierte, 2 felii de pâine integrală și jumătate de avocado",
  "Shake proteic: 40g whey, 300ml lapte și o banană",
  "250g mușchi de vită la grătar cu 250g cartofi copți",
  "100g fulgi de ovăz cu 30g unt de arahide, o lingură de miere și fructe de pădure",
];

export const NaturalLanguageModal: React.FC<NaturalLanguageModalProps> = ({
  isOpen,
  onClose,
  defaultSlot,
  availableSlots,
  onAddMealItems,
}) => {
  const [inputText, setInputText] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<MealSlotCategory>(defaultSlot);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<MacroMealItem[]>([]);

  // Dynamic slot options
  const slotOptions = React.useMemo(() => {
    if (availableSlots && availableSlots.length > 0) {
      return availableSlots.map((s) => ({ key: s, label: s }));
    }
    const hasDefault = MEAL_SLOT_OPTIONS.some((o) => o.key === defaultSlot);
    if (!hasDefault && defaultSlot) {
      return [{ key: defaultSlot, label: defaultSlot }, ...MEAL_SLOT_OPTIONS];
    }
    return MEAL_SLOT_OPTIONS;
  }, [availableSlots, defaultSlot]);

  // Sync selectedSlot when defaultSlot updates
  React.useEffect(() => {
    setSelectedSlot(defaultSlot);
  }, [defaultSlot]);

  // Clean state on modal close
  React.useEffect(() => {
    if (!isOpen) {
      setInputText("");
      setParsedItems([]);
      setErrorMsg(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setErrorMsg("Scrie sau alege un exemplu de masă mai sus.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const items = await parseNaturalLanguageMeal(inputText, selectedSlot);
      if (items.length === 0) {
        setErrorMsg("Nu s-au putut identifica alimente clare în text. Încearcă să precizezi alimentele și gramajele aproximative.");
      } else {
        setParsedItems(items);
      }
    } catch (err: unknown) {
      if (err instanceof AiUnavailableError || err instanceof AiApiError) {
        setErrorMsg(err.message);
      } else {
        console.error("Natural language parse error:", err);
        setErrorMsg("A apărut o problemă la procesarea textului. Te rugăm să încerci din nou.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveParsedItem = (id: string) => {
    setParsedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItemGrams = (id: string, newGrams: number) => {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const validG = Math.max(1, newGrams);
        const ratio = validG / Math.max(1, item.grams);
        return {
          ...item,
          grams: validG,
          calories: Math.round(item.calories * ratio),
          protein: Number((item.protein * ratio).toFixed(1)),
          carbs: Number((item.carbs * ratio).toFixed(1)),
          fats: Number((item.fats * ratio).toFixed(1)),
          fiber: item.fiber ? Number((item.fiber * ratio).toFixed(1)) : 0,
        };
      })
    );
  };

  const handleConfirmAddAll = () => {
    if (parsedItems.length === 0) return;
    onAddMealItems(parsedItems);
    onClose();
  };

  // Compute total macros for parsed batch
  const batchTotals = parsedItems.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fats: acc.fats + item.fats,
      fiber: acc.fiber + (item.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-[2.5rem] bg-[#121215] border border-white/10 shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <MessageSquareText className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Jurnal Inteligent prin Text
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Gemini 3.8 Flash
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Descrie masa în limbaj liber și AI-ul extrage alimentele și macronutrienții
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-9 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Target Meal Slot Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
              Masa în care salvezi:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {slotOptions.map((slot) => {
                const isSelected = selectedSlot === slot.key;
                return (
                  <button
                    key={slot.key}
                    type="button"
                    onClick={() => {
                      setSelectedSlot(slot.key);
                      // Update category on any already parsed items
                      setParsedItems((prev) =>
                        prev.map((i) => ({ ...i, category: slot.key }))
                      );
                    }}
                    className={`py-2 px-2 rounded-xl text-[11px] font-black text-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Natural Language Textarea */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
              Descrie ce ai mâncat:
            </label>
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder='ex: "Am mâncat 200g piept de pui la grătar cu 150g orez basmati fiert și o lingură de ulei de măsline"'
                rows={3}
                className="w-full p-4 rounded-2xl bg-zinc-900 border border-white/10 text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Quick Clickable Example Prompts */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
              Exemple rapide (apasă pentru a testa):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_PROMPTS.map((example, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(example)}
                  className="px-2.5 py-1 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/5 hover:border-indigo-500/30 text-[11px] font-medium text-zinc-300 hover:text-white transition-all cursor-pointer text-left"
                >
                  {example.length > 55 ? example.substring(0, 55) + "..." : example}
                </button>
              ))}
            </div>
          </div>

          {/* Analyze CTA */}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isLoading || !inputText.trim()}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all"
          >
            {isLoading ? (
              <>
                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Gemini analizează ingredientele...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>Analizează & Extrage Macro-nutrienți</span>
              </>
            )}
          </button>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
              <p className="font-semibold">{errorMsg}</p>
            </div>
          )}

          {/* Parsed Items Review & Confirmation Section */}
          {parsedItems.length > 0 && (
            <div className="space-y-4 pt-3 border-t border-white/10 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">
                    Alimente Identificate ({parsedItems.length})
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Verifică și ajustează porțiile înainte de a salva în jurnal
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setParsedItems([])}
                  className="text-[11px] font-semibold text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  <span>Resetează</span>
                </button>
              </div>

              {/* Items Card List */}
              <div className="space-y-2">
                {parsedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-zinc-900 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-indigo-500 shrink-0" />
                        <h5 className="text-sm font-bold text-white truncate">
                          {item.name}
                        </h5>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                        <span><strong>{item.calories}</strong> kcal</span>
                        <span>P: <strong className="text-blue-400">{item.protein}g</strong></span>
                        <span>C: <strong className="text-amber-400">{item.carbs}g</strong></span>
                        <span>G: <strong className="text-rose-400">{item.fats}g</strong></span>
                        {item.fiber ? <span>F: <strong className="text-emerald-400">{item.fiber}g</strong></span> : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={2000}
                          value={item.grams}
                          onChange={(e) => handleUpdateItemGrams(item.id, Number(e.target.value) || 1)}
                          className="w-16 h-8 px-2 text-center rounded-xl bg-black border border-white/15 text-xs font-black text-white focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-[11px] font-bold text-zinc-400">g</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveParsedItem(item.id)}
                        className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                        title="Elimină aliment"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Summary Banner */}
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block">
                    Total Masă
                  </span>
                  <p className="text-base font-black text-white">
                    {Math.round(batchTotals.calories)} kcal
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="text-blue-400">P: {Math.round(batchTotals.protein)}g</span>
                  <span className="text-amber-400">C: {Math.round(batchTotals.carbs)}g</span>
                  <span className="text-rose-400">G: {Math.round(batchTotals.fats)}g</span>
                </div>
              </div>

              {/* Bulk Add Button */}
              <button
                type="button"
                onClick={handleConfirmAddAll}
                className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
              >
                <Check className="size-4 stroke-[3]" />
                <span>
                  Salvează {parsedItems.length} {parsedItems.length === 1 ? "aliment" : "alimente"} în{" "}
                  {MEAL_SLOT_OPTIONS.find((s) => s.key === selectedSlot)?.label}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
