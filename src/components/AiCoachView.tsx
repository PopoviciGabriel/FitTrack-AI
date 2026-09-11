import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  Zap, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Flame,
  ArrowUpRight,
  RefreshCw
} from "lucide-react";
import { Workout, AiVolumeAnalysis } from "../types";
import { analyzeWorkoutVolume } from "../services/geminiService";
import { ProGuard } from "./ProGuard";

interface AiCoachViewProps {
  workouts: Workout[];
  onUpgradeClick: () => void;
}

export const AiCoachView: React.FC<AiCoachViewProps> = ({ workouts, onUpgradeClick }) => {
  const [analysis, setAnalysis] = useState<AiVolumeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const res = await analyzeWorkoutVolume(workouts);
      setAnalysis(res);
      localStorage.setItem("fittrack_last_ai_analysis", JSON.stringify(res));
    } catch (e) {
      console.error("AI Coach error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("fittrack_last_ai_analysis");
    if (saved) {
      try {
        setAnalysis(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else if (workouts.length > 0) {
      runAnalysis();
    }
  }, [workouts.length]);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="py-8 px-6 sticky top-0 bg-[#f4f7f0] dark:bg-[#0A0A0A] z-20 border-b border-slate-200 dark:border-white/5 -mx-4 transition-all flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-zinc-50 uppercase leading-none">
            AI Coach.
          </h1>
          <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1.5 leading-none">
            Volume & Overload Analyzer
          </p>
        </div>

        <button
          onClick={runAnalysis}
          disabled={loading || workouts.length === 0}
          className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-blue-600 dark:text-orange-500 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 shadow-sm"
          title="Reanalizează"
        >
          <RefreshCw className={`size-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      <ProGuard feature="ai_coach" onUpgradeClick={onUpgradeClick}>
        {loading ? (
          /* Skeleton Loader */
          <div className="space-y-6 animate-pulse">
            <div className="p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900/60 border border-slate-200/60 dark:border-white/5 h-48 flex flex-col justify-between">
              <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded-full" />
              <div className="h-8 w-48 bg-slate-200 dark:bg-zinc-800 rounded-full" />
              <div className="h-4 w-full bg-slate-200 dark:bg-zinc-800 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 rounded-[2rem] bg-slate-200 dark:bg-zinc-900" />
              <div className="h-32 rounded-[2rem] bg-slate-200 dark:bg-zinc-900" />
            </div>
            <div className="h-64 rounded-[2.5rem] bg-slate-200 dark:bg-zinc-900" />
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            {/* Top Score Hero Card */}
            <div className="p-8 bg-white dark:bg-[#1a1a1a] border border-slate-200/70 dark:border-white/5 rounded-[2.5rem] shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-orange-500">
                    Stare Recuperare & Sistem Nervos
                  </span>
                  <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight mt-1">
                    {analysis.recoveryStatus}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">
                    Nivel de oboseală estimat: <span className="font-bold text-slate-900 dark:text-white">{analysis.fatigueLevel}</span>
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center size-20 rounded-3xl bg-blue-50 dark:bg-orange-500/10 border border-blue-200 dark:border-orange-500/20 text-blue-600 dark:text-orange-400 font-black">
                  <span className="text-3xl tracking-tight leading-none">{analysis.recoveryScore}</span>
                  <span className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-zinc-500">/100</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    analysis.recoveryScore > 75
                      ? "bg-green-500"
                      : analysis.recoveryScore > 50
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${analysis.recoveryScore}%` }}
                />
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-blue-50/50 dark:bg-white/[0.02] border border-blue-100/80 dark:border-white/5">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-orange-500 mb-1 flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  Focus Următorul Antrenament
                </p>
                <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 leading-relaxed">
                  {analysis.nextWorkoutFocus}
                </p>
              </div>
            </div>

            {/* Muscle Volume Breakdown */}
            <div className="p-8 bg-white dark:bg-[#1a1a1a] border border-slate-200/70 dark:border-white/5 rounded-[2.5rem] shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-zinc-500">
                  Volum Săptămânal per Grupă Musculară
                </h3>
                <span className="text-[10px] font-bold text-slate-400">Țintă: 10-20 seturi</span>
              </div>

              <div className="space-y-3">
                {analysis.muscleVolumes.map((mv, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {mv.category}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-400 mt-0.5">
                        {mv.recommendedSetsRange}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {mv.directSets} seturi
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                          mv.status === "optim"
                            ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                            : mv.status === "sub-antrenat"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {mv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stagnation Detection */}
            {analysis.stagnantExercises.length > 0 && (
              <div className="p-8 bg-white dark:bg-[#1a1a1a] border border-slate-200/70 dark:border-white/5 rounded-[2.5rem] shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-zinc-500">
                    Detecție Stagnare & Soluții
                  </h3>
                </div>

                <div className="space-y-3">
                  {analysis.stagnantExercises.map((st, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/10"
                    >
                      <p className="font-black text-xs text-amber-950 dark:text-amber-400 uppercase">
                        {st.name}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium mt-1 leading-relaxed">
                        {st.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progressive Overload Guidelines */}
            <div className="p-8 bg-white dark:bg-[#1a1a1a] border border-slate-200/70 dark:border-white/5 rounded-[2.5rem] shadow-sm space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-zinc-500">
                Reguli de Progressive Overload
              </h3>

              <div className="space-y-3">
                {analysis.progressiveOverloadTips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs text-slate-700 dark:text-zinc-300 font-medium">
                    <div className="size-5 rounded-full bg-blue-600/10 dark:bg-orange-500/10 text-blue-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                      <ArrowUpRight className="size-3.5" />
                    </div>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center">
            <Activity className="size-12 text-slate-300 dark:text-zinc-700 mb-4" />
            <h4 className="font-black text-lg text-slate-900 dark:text-white uppercase mb-2">
              Lipsește Istoricul de Antrenament
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mb-6">
              Înregistrează cel puțin 1 antrenament pentru a rula analiza AI completă pe grupe musculare.
            </p>
            <button
              onClick={runAnalysis}
              className="px-6 py-3 rounded-xl bg-blue-600 dark:bg-orange-500 text-white dark:text-black font-black text-xs uppercase tracking-wider cursor-pointer"
            >
              Calculează Acum
            </button>
          </div>
        )}
      </ProGuard>
    </div>
  );
};
