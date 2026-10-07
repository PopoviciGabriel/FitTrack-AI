import React from "react";
import { Beef, CircleCheck, Clock, Droplet, Droplets, Flame, Leaf, Lightbulb, RefreshCw, Sparkles, Wheat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NutritionEngineMeta, NutritionTip, NutritionTipKind, NutritionTipPriority } from "../../types";
import { EngineModeBadge, EngineResultBadge } from "./NutritionEngineBadge";

const TIP_ICONS: Record<NutritionTipKind, LucideIcon> = {
  protein: Beef,
  calories: Flame,
  carbs: Wheat,
  fats: Droplet,
  fiber: Leaf,
  hydration: Droplets,
  timing: Clock,
  success: CircleCheck,
};

const PRIORITY_STYLES: Record<NutritionTipPriority, string> = {
  high: "bg-orange-500/10 border-orange-500/25 text-orange-500",
  medium: "bg-blue-500/10 border-blue-500/20 text-blue-500",
  low: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
};

interface NutritionTipsCardProps {
  tips: NutritionTip[];
  engine: NutritionEngineMeta;
  /** A Gemini key is configured, so personalized advice can be requested. */
  advancedAvailable: boolean;
  isLoading: boolean;
  onRequestAiAdvice: () => void;
}

export const NutritionTipsCard: React.FC<NutritionTipsCardProps> = ({
  tips,
  engine,
  advancedAvailable,
  isLoading,
  onRequestAiAdvice,
}) => {
  const showingAiTips = engine.source === "gemini";

  return (
    <div className="p-5 rounded-[2rem] bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Lightbulb className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Sfaturi pentru azi</h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Calculate din țintele tale și ce ai mâncat până acum</p>
          </div>
        </div>
        <EngineModeBadge advanced={showingAiTips} />
      </div>

      {tips.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-zinc-400">Totul arată bine. Continuă să îți înregistrezi mesele.</p>
      ) : (
        <ul className="space-y-2">
          {tips.map((tip) => {
            const Icon = TIP_ICONS[tip.kind];
            return (
              <li
                key={tip.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200/70 dark:border-white/5 flex items-start gap-3"
              >
                <span className={`p-1.5 rounded-xl border shrink-0 ${PRIORITY_STYLES[tip.priority]}`}>
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white">{tip.title}</p>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 leading-relaxed">{tip.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {showingAiTips || engine.localReason ? <EngineResultBadge engine={engine} /> : <span />}
        {advancedAvailable && (
          <button
            type="button"
            onClick={onRequestAiAdvice}
            disabled={isLoading}
            className="min-h-9 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 dark:text-purple-400 border border-purple-500/25 text-[11px] font-black uppercase tracking-wide cursor-pointer disabled:opacity-50 transition-all active:scale-95"
          >
            {isLoading ? <RefreshCw className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {isLoading ? "Gemini analizează..." : showingAiTips ? "Reîmprospătează" : "Sfaturi personalizate AI"}
          </button>
        )}
      </div>
    </div>
  );
};
