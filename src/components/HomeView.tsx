import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Sparkles, 
  Timer as TimerIcon
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
import { Workout, ProgressEntry } from "../types";
import { cn, formatDate } from "../lib/utils";
import { getWorkoutAdvice } from "../services/geminiService";
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
  const [advice, setAdvice] = useState<string>("");
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);

  useEffect(() => {
    const fetchAdvice = async () => {
      setLoadingAdvice(true);
      const res = await getWorkoutAdvice(workouts.slice(0, 3));
      setAdvice(res || "Prioritatea următoare: crește greutatea cu 1-2.5 kg sau adaugă o repetare la primul exercițiu compus.");
      setLoadingAdvice(false);
    };
    if (workouts.length > 0) {
      fetchAdvice();
    } else {
      setAdvice("Înregistrează prima sesiune pentru a primi rezumatul esențial cu ce ai de făcut în continuare.");
    }
  }, [workouts]);

  const recentWeight = progress.length > 0 ? progress[progress.length - 1].weight : null;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Banner Header */}
      <header className="flex justify-between items-center bg-[#f4f7f0] dark:bg-[#0A0A0A] sticky top-0 z-20 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-6 border-b border-slate-200 dark:border-white/5 -mx-4 transition-all">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-zinc-50 uppercase leading-none">FitTrack.</h1>
          <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.35em] mt-1.5 leading-none">
            HIPERTROFIE & PROGRES • 100% GRATUIT
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

      {/* AI Coach Quick Tip Card - Complete Statement, Actionable Summary */}
      <Card className="bg-blue-50/50 dark:bg-gradient-to-br dark:from-orange-500/[0.05] dark:to-transparent border-blue-100/70 dark:border-orange-500/20 shadow-none">
        <div className="flex gap-4 items-start">
          <div className="bg-blue-600/10 dark:bg-orange-500/10 p-3 rounded-2xl shrink-0 text-blue-600 dark:text-orange-500 mt-0.5">
            <Sparkles className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1.5">
              <h4 className="font-black text-blue-600 dark:text-orange-500 text-[10px] uppercase tracking-[0.2em] leading-none">
                AI Coach Insight
              </h4>
              <button
                onClick={() => onTabChange("coach")}
                className="text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-orange-400 hover:underline cursor-pointer shrink-0 ml-2"
              >
                Analiză Completă →
              </button>
            </div>
            <p 
              className={cn(
                "text-slate-800 dark:text-zinc-200 text-sm font-medium leading-relaxed",
                loadingAdvice && "animate-pulse"
              )}
            >
              {loadingAdvice ? "Analizăm sesiunile tale pentru recomandarea de acțiune..." : advice}
            </p>
          </div>
        </div>
      </Card>

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
