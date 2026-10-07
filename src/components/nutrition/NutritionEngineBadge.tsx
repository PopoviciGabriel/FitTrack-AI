import React from "react";
import { Cpu, Sparkles, Zap } from "lucide-react";
import { LocalEngineReason, NutritionEngineMeta } from "../../types";
import { GEMINI_MODEL } from "../../services/geminiService";

const LOCAL_REASON_HINTS: Record<LocalEngineReason, string> = {
  no_api_key: "Adaugă o cheie Gemini în Setări pentru analiza avansată.",
  invalid_key: "Cheia Gemini pare invalidă. O poți verifica în Setări.",
  offline: "Fără conexiune la internet.",
  api_unavailable: "Gemini este suprasolicitat momentan.",
  timeout: "Gemini a răspuns prea lent.",
};

interface EngineModeBadgeProps {
  advanced: boolean;
  className?: string;
}

/** Header label: which engine will answer by default. */
export const EngineModeBadge: React.FC<EngineModeBadgeProps> = ({ advanced, className = "" }) =>
  advanced ? (
    <span
      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-black uppercase whitespace-nowrap ${className}`}
    >
      <Sparkles className="size-3" />
      Gemini 3.8 Flash
    </span>
  ) : (
    <span
      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-black whitespace-nowrap ${className}`}
    >
      <Cpu className="size-3" />
      FitTrack Smart Engine
    </span>
  );

interface EngineResultBadgeProps {
  engine: NutritionEngineMeta;
}

/** Discreet note on a result: processed locally (and why), or answered by a fallback Gemini model. */
export const EngineResultBadge: React.FC<EngineResultBadgeProps> = ({ engine }) => {
  if (engine.source === "gemini") {
    if (!engine.model || engine.model === GEMINI_MODEL) return null;
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-400/80" title="Modelul principal era indisponibil">
        <Sparkles className="size-3" />
        via {engine.model}
      </span>
    );
  }

  const hint = engine.localReason ? LOCAL_REASON_HINTS[engine.localReason] : undefined;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-bold text-emerald-400/90" title={hint}>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <Zap className="size-3" />
        Procesat local (Mod Rapid)
      </span>
      {hint && engine.localReason !== "no_api_key" && <span className="font-medium text-zinc-500">{hint}</span>}
    </span>
  );
};
