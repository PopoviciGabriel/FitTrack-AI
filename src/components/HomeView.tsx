import React, { useState, useEffect, useMemo } from "react";
import { 
  ChevronRight,
  Play,
  Plus, 
  Sparkles, 
  Timer as TimerIcon,
  Utensils,
  type LucideIcon
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Workout, ProgressEntry, HomeCoachInsight, HomeInsightAction } from "../types";
import { cn, formatDate } from "../lib/utils";
import { personalizeHomeInsight } from "../services/geminiService";
import { buildHomeDayState, buildLocalHomeInsight } from "../services/homeInsightService";
import { WeightInputModal } from "./WeightInputModal";

export const Card = ({ 
  children, 
  className, 
  title,
  onClick
}: { 
  children: React.ReactNode; 
  className?: string; 
  title?: string;
  onClick?: () => void;
}) => {
  const isCentered = className?.includes("text-center") || className?.includes("items-center");

  return (
    <div 
      onClick={onClick}
      className={cn(
        "rounded-[2.5rem] p-8 mb-6 transition-all duration-700",
        "bg-white dark:bg-[#1a1a1a] border border-slate-200/60 dark:border-white/[0.05] shadow-[0_12px_30px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-3xl",
        className
      )}
    >
      {title && (
        <h3 className={cn(
          "text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2 truncate",
          isCentered ? "w-full flex justify-center text-center" : "block"
        )}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};

const INSIGHT_ACTION_ICON: Record<HomeInsightAction, LucideIcon> = {
  start_workout: Play,
  create_workout: Plus,
  log_meal: Utensils,
};

const CoachInsightCard = ({
  insight,
  text,
  onAction,
  onOpenCoach,
}: {
  insight: HomeCoachInsight;
  text: string;
  onAction: () => void;
  onOpenCoach: () => void;
}) => {
  const ActionIcon = INSIGHT_ACTION_ICON[insight.action];

  return (
    <section
      aria-label="AI Coach Insight"
      className="rounded-3xl p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm!"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold tracking-tight text-blue-600 dark:text-orange-500">
          <Sparkles className="size-3.5" aria-hidden="true" />
          AI Coach Insight
        </h2>
        <button
          type="button"
          onClick={onOpenCoach}
          className="-my-3 -mr-2 inline-flex h-11 items-center gap-0.5 px-2 text-[13px] font-medium tracking-tight text-zinc-400 dark:text-zinc-500 active:opacity-50 transition-opacity cursor-pointer"
        >
          Detalii
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <p aria-live="polite" className="mt-2 text-[17px] leading-snug font-medium tracking-tight text-zinc-900 dark:text-zinc-50">
        {text}
      </p>

      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-full px-5 bg-blue-600 dark:bg-orange-500 text-white dark:text-black text-[15px] font-semibold tracking-tight active:scale-[0.97] transition-transform duration-150 cursor-pointer"
      >
        <ActionIcon className={cn("size-4", insight.action === "start_workout" && "fill-current")} aria-hidden="true" />
        {insight.actionLabel}
      </button>
    </section>
  );
};

export interface HomeViewProps {
  workouts: Workout[];
  progress: ProgressEntry[];
  onAddWorkout: () => void;
  onSelectWorkout: (w: Workout) => void;
  theme: string;
  isPro: boolean;
  onOpenUpgrade: () => void;
  onOpenRestTimer: () => void;
  onTabChange: (t: string) => void;
  onAddProgress?: (weight: number) => void;
}

export const HomeView = ({ 
  workouts, 
  progress, 
  onAddWorkout, 
  onSelectWorkout, 
  theme,
  isPro,
  onOpenUpgrade,
  onOpenRestTimer,
  onTabChange,
  onAddProgress
}: HomeViewProps) => {
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [dayRefreshTick, setDayRefreshTick] = useState(0);
  const [aiInsight, setAiInsight] = useState<{ localText: string; text: string } | null>(null);

  // A home-screen PWA stays alive in the background: re-read the day (meals, date, hour) when it comes back.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") setDayRefreshTick((tick) => tick + 1);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const dayState = useMemo(() => buildHomeDayState(workouts), [workouts, dayRefreshTick]);
  const localInsight = useMemo(() => buildLocalHomeInsight(dayState), [dayState]);

  useEffect(() => {
    let cancelled = false;
    personalizeHomeInsight(dayState, localInsight).then((text) => {
      if (!cancelled && text) setAiInsight({ localText: localInsight.text, text });
    });
    return () => {
      cancelled = true;
    };
  }, [dayState, localInsight]);

  const insightText = aiInsight?.localText === localInsight.text ? aiInsight.text : localInsight.text;

  const handleInsightAction = () => {
    switch (localInsight.action) {
      case "start_workout":
        if (localInsight.workout) onSelectWorkout(localInsight.workout);
        else onAddWorkout();
        break;
      case "create_workout":
        onAddWorkout();
        break;
      case "log_meal":
        onTabChange("nutrition");
        break;
    }
  };

  const recentWeight = progress.length > 0 ? progress[progress.length - 1].weight : null;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Banner Header */}
      <header className="flex justify-between items-center bg-[#f4f7f0] dark:bg-[#000000] sticky top-[env(safe-area-inset-top)] z-20 pt-2 pb-4 px-6 -mx-4 transition-all">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-zinc-50 uppercase leading-none">FITTRACK</h1>
          <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.35em] mt-1.5 leading-none">
            HIPERTROFIE & PROGRES
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onOpenRestTimer}
            className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-slate-700 dark:text-zinc-300 hover:text-blue-600 cursor-pointer shadow-xs active:scale-95 transition-transform duration-150"
            title="Timer Odihnă"
          >
            <TimerIcon className="size-5" />
          </button>
          <button 
            onClick={onAddWorkout} 
            className="bg-blue-600 dark:bg-orange-500 hover:bg-blue-700 dark:hover:bg-orange-600 text-white dark:text-black p-3.5 rounded-[1.2rem] shadow-xl shadow-blue-600/20 cursor-pointer active:scale-95 transition-transform duration-150"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </header>

      <CoachInsightCard
        insight={localInsight}
        text={insightText}
        onAction={handleInsightAction}
        onOpenCoach={() => onTabChange("coach")}
      />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card 
          title="Greutate" 
          onClick={() => setShowWeightModal(true)}
          className="flex flex-col items-center justify-center border-slate-200/60 dark:border-white/5 shadow-xs text-center cursor-pointer active:scale-95 transition-transform group relative"
        >
          {/* Subtle top-right quick-add/edit icon */}
          <div className="absolute top-4 right-4 text-slate-400 group-hover:text-slate-700 dark:text-zinc-500 dark:group-hover:text-zinc-200 transition-colors">
            <Plus className="size-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">
              {recentWeight !== null ? recentWeight : "--"}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest leading-none text-slate-500 dark:text-zinc-400">
              kg
            </span>
          </div>
        </Card>
        <Card title="Antrenamente" className="flex flex-col items-center justify-center border-slate-200/60 dark:border-white/5 shadow-xs text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">{workouts.length}</span>
            <span className="text-[10px] font-black uppercase tracking-widest leading-none text-slate-500 dark:text-zinc-400">total</span>
          </div>
        </Card>
      </div>

      {/* Weight Chart */}
      <Card title="Evoluție Greutate" className="border-slate-200/60 dark:border-white/5 shadow-xs">
        <div className="h-[180px] w-full mt-2">
          {progress.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={progress}>
                <CartesianGrid strokeDasharray="6 6" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" hide={true} />
                <YAxis hide={true} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', 
                    border: theme === 'dark' ? 'none' : '1px solid #e2e8f0', 
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ color: theme === 'dark' ? '#f97316' : '#2563EB', fontWeight: 'bold' }}
                  labelFormatter={(v) => formatDate(v)}
                />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke={theme === 'dark' ? '#f97316' : '#2563EB'} 
                  strokeWidth={4} 
                  dot={{ r: 0 }} 
                  activeDot={{ r: 6, fill: theme === 'dark' ? '#f97316' : '#2563EB', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-black uppercase tracking-widest italic text-center px-8 opacity-60">
              Introdu cel puțin 2 intrări pentru grafic.
            </div>
          )}
        </div>
      </Card>

      {/* Weight Quick Input Modal */}
      <WeightInputModal
        isOpen={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        onSave={(newWeight) => {
          if (onAddProgress) {
            onAddProgress(newWeight);
          }
        }}
        currentWeight={recentWeight}
      />
    </div>
  );
};
