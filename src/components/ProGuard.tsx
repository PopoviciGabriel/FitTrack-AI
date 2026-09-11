import React, { useEffect, useState } from "react";
import { Lock, Sparkles, Zap, ChevronRight } from "lucide-react";
import { PurchaseService } from "../services/purchaseService";

interface ProGuardProps {
  feature: "ai_coach" | "nutrition" | "advanced_charts" | "cloud_sync" | "unlimited_routines" | string;
  featureTitle?: string;
  description?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onUpgradeClick?: () => void;
  showPreview?: boolean;
}

const FEATURE_DESCRIPTIONS: Record<string, { title: string; desc: string }> = {
  ai_coach: {
    title: "AI Coach & Volume Analyzer",
    desc: "Analiză avansată cu Gemini a volumului pe grupe musculare, detecția stagnării și sugestii specifice de Progressive Overload.",
  },
  nutrition: {
    title: "Calorie & Macro Tracker Integrat",
    desc: "Monitorizează zilnic caloriile, proteinele, carbohidrații și grăsimile sincronizate cu obiectivele tale de hipertrofie.",
  },
  advanced_charts: {
    title: "Grafice & Statistici Avansate",
    desc: "Evoluția 1RM estimată în timp, volum total per grupă musculară și frecvență săptămânală pe exerciții.",
  },
  cloud_sync: {
    title: "Cloud Sync & Export CSV/JSON",
    desc: "Backup securizat în cloud și export complet al tuturor sesiunilor și evoluției corporale.",
  },
  unlimited_routines: {
    title: "Rutine & Template-uri Nelimitate",
    desc: "Creează și salvează split-uri complete (Push/Pull/Legs, Upper/Lower, Arnold Split) fără restricții.",
  },
};

export const ProGuard: React.FC<ProGuardProps> = ({
  feature,
  featureTitle,
  description,
  children,
  fallback,
  onUpgradeClick,
  showPreview = false,
}) => {
  const [isPro, setIsPro] = useState(PurchaseService.isPro());

  useEffect(() => {
    return PurchaseService.subscribe((license) => {
      setIsPro(license.isProUser);
    });
  }, []);

  if (isPro) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const meta = FEATURE_DESCRIPTIONS[feature] || {
    title: featureTitle || "Funcție PRO Exclusivă",
    desc: description || "Deblochează accesul nelimitat cu licența pe viață FitTrack PRO.",
  };

  return (
    <div className="relative rounded-[2.5rem] border border-blue-200/80 dark:border-orange-500/20 bg-gradient-to-b from-blue-50/70 via-white to-white dark:from-zinc-900/90 dark:via-zinc-950 dark:to-zinc-950 p-8 shadow-sm overflow-hidden text-center">
      {/* Background ambient badge */}
      <div className="absolute top-4 right-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white dark:bg-orange-500 dark:text-black shadow-md">
          <Sparkles className="size-3" />
          PRO
        </span>
      </div>

      <div className="flex flex-col items-center max-w-md mx-auto pt-4">
        <div className="size-16 rounded-3xl bg-blue-600/10 dark:bg-orange-500/10 border border-blue-600/20 dark:border-orange-500/20 flex items-center justify-center mb-5 text-blue-600 dark:text-orange-500 shadow-inner">
          <Lock className="size-8" />
        </div>

        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-orange-500 mb-2">
          Deblocare Lifetime
        </span>

        <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white uppercase leading-tight mb-3">
          {meta.title}
        </h3>

        <p className="text-slate-600 dark:text-zinc-400 text-sm font-medium leading-relaxed mb-6">
          {meta.desc}
        </p>

        {showPreview && (
          <div className="w-full opacity-35 filter blur-[1.5px] pointer-events-none select-none mb-6">
            {children}
          </div>
        )}

        <button
          onClick={onUpgradeClick}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white dark:text-zinc-950 font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/25 dark:shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
        >
          <Zap className="size-4" />
          <span>Deblochează PRO • 19.99 RON</span>
          <ChevronRight className="size-4" />
        </button>

        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest mt-4">
          Plată o singură dată • Fără abonamente recurente
        </p>
      </div>
    </div>
  );
};
