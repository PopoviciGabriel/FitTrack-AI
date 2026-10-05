import React from "react";
import { Cpu } from "lucide-react";
import { DynamicTdeeResult } from "../../types";

interface TdeeEngineCardProps {
  result: DynamicTdeeResult;
}

const formatSigned = (n: number): string => `${n > 0 ? "+" : ""}${n}`;

export const TdeeEngineCard: React.FC<TdeeEngineCardProps> = ({ result }) => {
  return (
    <div className="p-5 rounded-[2rem] bg-white dark:bg-[#141414] border border-slate-200 dark:border-white/5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500 shrink-0">
          <Cpu className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-black text-slate-950 dark:text-white text-xs uppercase tracking-[0.2em] leading-none">
            AI TDEE Engine
          </h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mt-1.5 leading-none">
            Metabolism adaptiv
          </p>
        </div>
      </div>

      {result.status === "ok" ? (
        <>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
              Metabolismul tău actual
            </p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-4xl font-black tracking-tighter text-orange-500 leading-none">
                {result.tdee}
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                kcal/zi
              </span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-white/5">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Consum mediu
              </p>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                {result.avgCalories}
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500"> kcal</span>
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-white/5">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Tendință
              </p>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                {formatSigned(result.weightChangeKg)}
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500"> kg</span>
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-white/5">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Balanță
              </p>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                {formatSigned(result.dailyBalance)}
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500"> kcal</span>
              </p>
            </div>
          </div>

          <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500">
            Calculat pe {result.periodDays} zile • {result.weightDays} cântăriri • {result.calorieDays} zile cu calorii
          </p>
        </>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 leading-relaxed">
            {result.reason === "implausible_result"
              ? "Datele loghate par incomplete sau neobișnuite. Verifică greutatea și caloriile introduse."
              : "Loghează greutatea și caloriile 7 zile pentru calculul adaptiv."}
          </p>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-600">
            {result.weightDays} cântăriri • {result.calorieDays} zile cu calorii
          </p>
        </div>
      )}
    </div>
  );
};
