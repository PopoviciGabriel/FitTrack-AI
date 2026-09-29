import React, { useState, useMemo } from "react";
import { 
  Activity, 
  TrendingUp, 
  Dumbbell, 
  Trophy, 
  Zap, 
  Calendar, 
  Flame, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight,
  BarChart3,
  CheckCircle2
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";
import { Workout, ExerciseEntry } from "../types";
import { cn, formatDate } from "../lib/utils";

export interface EvolutionViewProps {
  workouts: Workout[];
  theme: "light" | "dark";
  onUpgradeClick?: () => void;
}

interface SessionPoint {
  workoutId: string;
  title: string;
  date: string;
  timestamp: number;
  totalVolume: number;
  totalReps: number;
  totalSets: number;
  max1RM: number;
  bestExercise: string;
}

export const EvolutionView = ({ 
  workouts, 
  theme 
}: EvolutionViewProps) => {
  const [metricMode, setMetricMode] = useState<"volume" | "1rm">("volume");
  const [timeframe, setTimeframe] = useState<"all" | "90" | "30">("all");
  const [searchExercise, setSearchExercise] = useState<string>("");

  // Flatten and process all historical workout sessions chronologically
  const timelinePoints = useMemo<SessionPoint[]>(() => {
    const list: SessionPoint[] = [];

    workouts.forEach(w => {
      // Collect historical snapshots if present
      const snapshots = [...(w.history || [])];
      snapshots.forEach(snap => {
        let vol = 0;
        let reps = 0;
        let setsCount = 0;
        let highest1RM = 0;
        let bestEx = "";

        snap.entries.forEach(entry => {
          const completedSets = entry.sets.filter(s => s.completed);
          const activeSets = completedSets.length > 0 ? completedSets : entry.sets;

          activeSets.forEach(s => {
            const weight = s.weight || 0;
            const r = s.reps || 0;
            if (weight > 0 && r > 0) {
              vol += weight * r;
              reps += r;
              setsCount += 1;
              const est1RM = r > 1 ? weight * (1 + r / 30) : weight;
              if (est1RM > highest1RM) {
                highest1RM = est1RM;
                bestEx = entry.name;
              }
            }
          });
        });

        if (vol > 0 || highest1RM > 0) {
          list.push({
            workoutId: `${w.id}-snap-${snap.date}`,
            title: w.title,
            date: snap.date,
            timestamp: new Date(snap.date).getTime() || 0,
            totalVolume: Math.round(vol),
            totalReps: reps,
            totalSets: setsCount,
            max1RM: Math.round(highest1RM),
            bestExercise: bestEx || "Exercițiu compus"
          });
        }
      });

      // Current workout entry
      let currentVol = 0;
      let currentReps = 0;
      let currentSetsCount = 0;
      let currentMax1RM = 0;
      let currentBestEx = "";

      w.entries.forEach(entry => {
        const completedSets = entry.sets.filter(s => s.completed);
        const activeSets = completedSets.length > 0 ? completedSets : entry.sets;

        activeSets.forEach(s => {
          const weight = s.weight || 0;
          const r = s.reps || 0;
          if (weight > 0 && r > 0) {
            currentVol += weight * r;
            currentReps += r;
            currentSetsCount += 1;
            const est1RM = r > 1 ? weight * (1 + r / 30) : weight;
            if (est1RM > currentMax1RM) {
              currentMax1RM = est1RM;
              currentBestEx = entry.name;
            }
          }
        });
      });

      if (currentVol > 0 || currentMax1RM > 0) {
        list.push({
          workoutId: w.id,
          title: w.title,
          date: w.date,
          timestamp: new Date(w.date).getTime() || 0,
          totalVolume: Math.round(currentVol),
          totalReps: currentReps,
          totalSets: currentSetsCount,
          max1RM: Math.round(currentMax1RM),
          bestExercise: currentBestEx || "Exercițiu compus"
        });
      }
    });

    // Sort chronologically ascending
    return list.sort((a, b) => a.timestamp - b.timestamp);
  }, [workouts]);

  // Filter timeline points by chosen timeframe
  const filteredTimeline = useMemo(() => {
    if (timeframe === "all") return timelinePoints;
    const now = Date.now();
    const days = timeframe === "30" ? 30 : 90;
    const threshold = now - days * 24 * 60 * 60 * 1000;
    return timelinePoints.filter(p => p.timestamp >= threshold);
  }, [timelinePoints, timeframe]);

  // Global aggregate metrics
  const globalStats = useMemo(() => {
    let totalTonnage = 0;
    let totalSets = 0;
    let totalReps = 0;
    let overallPeak1RM = 0;
    let peakExercise = "";

    timelinePoints.forEach(pt => {
      totalTonnage += pt.totalVolume;
      totalSets += pt.totalSets;
      totalReps += pt.totalReps;
      if (pt.max1RM > overallPeak1RM) {
        overallPeak1RM = pt.max1RM;
        peakExercise = pt.bestExercise;
      }
    });

    const averageTonnage = timelinePoints.length > 0 
      ? Math.round(totalTonnage / timelinePoints.length) 
      : 0;

    return {
      totalTonnage,
      totalSets,
      totalReps,
      overallPeak1RM,
      peakExercise,
      averageTonnage,
      sessionsCount: timelinePoints.length
    };
  }, [timelinePoints]);

  // Aggregate Exercise-Level PRs and progression
  const exerciseStats = useMemo(() => {
    const map = new Map<string, {
      name: string;
      max1RM: number;
      bestWeight: number;
      bestReps: number;
      totalSets: number;
      historyCount: number;
      lastDate: string;
    }>();

    workouts.forEach(w => {
      const allEntries: { date: string; entries: ExerciseEntry[] }[] = [
        ...(w.history || []).map(h => ({ date: h.date, entries: h.entries })),
        { date: w.date, entries: w.entries }
      ];

      allEntries.forEach(session => {
        session.entries.forEach(entry => {
          const key = (entry.exerciseId || entry.name).trim().toLowerCase();
          const cleanName = entry.name.trim();

          const existing = map.get(key) || {
            name: cleanName,
            max1RM: 0,
            bestWeight: 0,
            bestReps: 0,
            totalSets: 0,
            historyCount: 0,
            lastDate: session.date
          };

          let sessionSets = 0;
          entry.sets.forEach(s => {
            const wKg = s.weight || 0;
            const r = s.reps || 0;
            if (wKg > 0 && r > 0) {
              sessionSets++;
              const est1RM = r > 1 ? wKg * (1 + r / 30) : wKg;
              if (est1RM > existing.max1RM) {
                existing.max1RM = Math.round(est1RM);
                existing.bestWeight = wKg;
                existing.bestReps = r;
              }
            }
          });

          if (sessionSets > 0) {
            existing.totalSets += sessionSets;
            existing.historyCount += 1;
            if (new Date(session.date).getTime() > new Date(existing.lastDate).getTime()) {
              existing.lastDate = session.date;
            }
          }

          map.set(key, existing);
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.max1RM - a.max1RM);
  }, [workouts]);

  // Filtered exercise list for the explorer section
  const filteredExercises = useMemo(() => {
    if (!searchExercise.trim()) return exerciseStats;
    const query = searchExercise.toLowerCase().trim();
    return exerciseStats.filter(e => e.name.toLowerCase().includes(query));
  }, [exerciseStats, searchExercise]);

  // Formatter for total tonnage display
  const formatTonnageDisplay = (kg: number) => {
    if (kg >= 1000) {
      return {
        value: (kg / 1000).toFixed(1),
        unit: "tone"
      };
    }
    return {
      value: kg.toLocaleString("ro-RO"),
      unit: "kg"
    };
  };

  const tonnageFormatted = formatTonnageDisplay(globalStats.totalTonnage);

  // Calculate overall performance trend (first half vs second half or last 2)
  const performanceTrendPct = useMemo(() => {
    if (filteredTimeline.length < 2) return null;
    const firstPoint = filteredTimeline[0];
    const lastPoint = filteredTimeline[filteredTimeline.length - 1];

    const valA = metricMode === "volume" ? firstPoint.totalVolume : firstPoint.max1RM;
    const valB = metricMode === "volume" ? lastPoint.totalVolume : lastPoint.max1RM;

    if (valA === 0) return null;
    const pct = ((valB - valA) / valA) * 100;
    return Math.round(pct * 10) / 10;
  }, [filteredTimeline, metricMode]);

  return (
    <div className="space-y-6 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-500 select-none">
      {/* Top Header */}
      <header className="pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-6 sticky top-0 bg-[#f4f7f0] dark:bg-[#000000] z-20 border-b border-slate-200 dark:border-white/5 -mx-4 transition-all">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-zinc-50 uppercase leading-none">
              Evoluție.
            </h1>
            <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1.5 leading-none">
              Analiză Performanță & Progres
            </p>
          </div>
          <div className="bg-slate-200/70 dark:bg-white/5 p-1 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => setTimeframe("30")}
              className={cn(
                "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95",
                timeframe === "30" 
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-orange-500 shadow-xs" 
                  : "text-slate-500 dark:text-zinc-400"
              )}
            >
              30z
            </button>
            <button
              onClick={() => setTimeframe("90")}
              className={cn(
                "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95",
                timeframe === "90" 
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-orange-500 shadow-xs" 
                  : "text-slate-500 dark:text-zinc-400"
              )}
            >
              90z
            </button>
            <button
              onClick={() => setTimeframe("all")}
              className={cn(
                "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95",
                timeframe === "all" 
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-orange-500 shadow-xs" 
                  : "text-slate-500 dark:text-zinc-400"
              )}
            >
              Tot
            </button>
          </div>
        </div>
      </header>

      {/* Global Performance Summary Cards */}
      <div className="grid grid-cols-2 gap-3.5 px-1">
        {/* Tonaj Total */}
        <div className="p-6 bg-white dark:bg-[#141414] border border-slate-200/60 dark:border-white/5 rounded-[2.5rem] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
              Tonaj Total
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-orange-500/10 text-blue-600 dark:text-orange-500">
              <Dumbbell className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
              {tonnageFormatted.value}
            </span>
            <span className="text-xs font-black uppercase text-blue-600 dark:text-orange-500">
              {tonnageFormatted.unit}
            </span>
          </div>
          <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 mt-2 truncate">
            ~{globalStats.averageTonnage.toLocaleString("ro-RO")} kg / sesiune
          </p>
        </div>

        {/* Antrenamente Înregistrate */}
        <div className="p-6 bg-white dark:bg-[#141414] border border-slate-200/60 dark:border-white/5 rounded-[2.5rem] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
              Sesiuni
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Flame className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
              {globalStats.sessionsCount}
            </span>
            <span className="text-xs font-black uppercase text-slate-400 dark:text-zinc-500">
              total
            </span>
          </div>
          <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 mt-2 truncate">
            {globalStats.totalSets} seturi • {globalStats.totalReps} repetări
          </p>
        </div>

        {/* Top 1RM Record */}
        <div className="col-span-2 p-6 bg-white dark:bg-[#141414] border border-slate-200/60 dark:border-white/5 rounded-[2.5rem] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0 pr-2">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0">
              <Trophy className="size-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 block mb-0.5">
                Record Forță (1RM Estimat)
              </span>
              <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                {globalStats.peakExercise || "Niciun exercițiu compus"}
              </p>
            </div>
          </div>
          <div className="flex items-baseline gap-1 shrink-0">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {globalStats.overallPeak1RM > 0 ? globalStats.overallPeak1RM : "--"}
            </span>
            <span className="text-[10px] font-black uppercase text-slate-400">kg</span>
          </div>
        </div>
      </div>

      {/* Main Progression Chart Card */}
      <div className="p-7 bg-white dark:bg-[#141414] border border-slate-200/60 dark:border-white/5 rounded-[2.5rem] shadow-xs space-y-5 mx-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-blue-600 dark:text-orange-500" />
              <h3 className="font-black text-lg text-slate-950 dark:text-white uppercase tracking-tight leading-none">
                Trend Performanță în Timp
              </h3>
            </div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1">
              {metricMode === "volume" ? "Tonaj total ridicat per sesiune" : "1RM maxim înregistrat"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {performanceTrendPct !== null && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider",
                performanceTrendPct >= 0 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              )}>
                {performanceTrendPct >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {performanceTrendPct >= 0 ? `+${performanceTrendPct}%` : `${performanceTrendPct}%`}
              </span>
            )}

            <div className="bg-slate-100 dark:bg-black/50 p-1 rounded-2xl flex items-center border border-slate-200/60 dark:border-white/5">
              <button
                onClick={() => setMetricMode("volume")}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer",
                  metricMode === "volume"
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-orange-500 shadow-xs"
                    : "text-slate-400 dark:text-zinc-500 hover:text-slate-700"
                )}
              >
                Tonaj (kg)
              </button>
              <button
                onClick={() => setMetricMode("1rm")}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer",
                  metricMode === "1rm"
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-orange-500 shadow-xs"
                    : "text-slate-400 dark:text-zinc-500 hover:text-slate-700"
                )}
              >
                1RM (kg)
              </button>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-[210px] w-full pt-2">
          {filteredTimeline.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="evolutionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="5%" 
                      stopColor={theme === "dark" ? "#f97316" : "#2563eb"} 
                      stopOpacity={0.4} 
                    />
                    <stop 
                      offset="95%" 
                      stopColor={theme === "dark" ? "#f97316" : "#2563eb"} 
                      stopOpacity={0.0} 
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="5 5" stroke={theme === "dark" ? "#262626" : "#f1f5f9"} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => formatDate(val)} 
                  stroke={theme === "dark" ? "#525252" : "#94a3b8"}
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke={theme === "dark" ? "#525252" : "#94a3b8"}
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  domain={["dataMin - 5", "dataMax + 10"]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === "dark" ? "#18181b" : "#ffffff", 
                    borderColor: theme === "dark" ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                    borderRadius: "18px",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
                    padding: "10px 14px"
                  }}
                  itemStyle={{ 
                    color: theme === "dark" ? "#f97316" : "#2563eb", 
                    fontWeight: 900,
                    fontSize: "12px"
                  }}
                  labelStyle={{
                    color: theme === "dark" ? "#ffffff" : "#0f172a",
                    fontWeight: 900,
                    fontSize: "11px",
                    marginBottom: "4px",
                    textTransform: "uppercase"
                  }}
                  labelFormatter={(val) => formatDate(val)}
                  formatter={(val: number) => [
                    `${val.toLocaleString("ro-RO")} kg`,
                    metricMode === "volume" ? "Tonaj Sesiune" : "1RM Maxim"
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey={metricMode === "volume" ? "totalVolume" : "max1RM"} 
                  stroke={theme === "dark" ? "#f97316" : "#2563eb"} 
                  strokeWidth={3.5} 
                  fillOpacity={1} 
                  fill="url(#evolutionGrad)" 
                  activeDot={{ 
                    r: 6, 
                    fill: theme === "dark" ? "#f97316" : "#2563eb", 
                    strokeWidth: 3,
                    stroke: theme === "dark" ? "#000000" : "#ffffff"
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-black/30 rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
              <Activity className="size-8 text-slate-300 dark:text-zinc-700 mb-2" />
              <p className="text-slate-400 dark:text-zinc-500 text-xs font-black uppercase tracking-wider">
                Date insuficiente pentru graficul de trend
              </p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-600 mt-1 max-w-[240px]">
                Finalizează cel puțin 2 antrenamente pentru a genera curba de volum și forță.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Exercise PR & Strength Progression Leaderboard */}
      <div className="space-y-4 px-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h3 className="font-black text-xl text-slate-950 dark:text-white uppercase tracking-tight leading-none">
              Progres Exerciții & Recorduri
            </h3>
            <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1">
              Top 1RM estimat și greutate maximă per exercițiu
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[180px]">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={searchExercise}
              onChange={(e) => setSearchExercise(e.target.value)}
              placeholder="Caută exercițiu..."
              className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#141414] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </div>

        {/* Exercises List */}
        <div className="space-y-2.5">
          {filteredExercises.map((ex, idx) => (
            <div 
              key={idx}
              className="p-5 bg-white dark:bg-[#141414] border border-slate-200/60 dark:border-white/5 rounded-[2rem] shadow-xs flex items-center justify-between gap-4 transition-all hover:border-blue-500/20 dark:hover:border-orange-500/20"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-blue-600 dark:text-orange-500 bg-blue-500/10 dark:bg-orange-500/10 px-2 py-0.5 rounded-md">
                    #{idx + 1}
                  </span>
                  <h4 className="font-black text-slate-950 dark:text-white text-sm uppercase tracking-tight truncate">
                    {ex.name}
                  </h4>
                </div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 mt-1">
                  Cel mai bun set: <span className="text-slate-700 dark:text-zinc-300 font-black">{ex.bestWeight}kg × {ex.bestReps} reps</span> • {ex.totalSets} seturi totale
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-xl font-black text-slate-950 dark:text-white">
                    {ex.max1RM}
                  </span>
                  <span className="text-[10px] font-black uppercase text-blue-600 dark:text-orange-500">
                    kg 1RM
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase">
                  {ex.historyCount} {ex.historyCount === 1 ? "sesiune" : "sesiuni"}
                </span>
              </div>
            </div>
          ))}

          {filteredExercises.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-[#141414] rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 p-8 flex flex-col items-center">
              <Dumbbell className="size-10 text-slate-300 dark:text-zinc-700 mb-3" />
              <p className="text-slate-400 dark:text-zinc-500 text-xs font-black uppercase tracking-wider">
                {searchExercise ? "Niciun exercițiu găsit pentru căutarea curentă" : "Niciun exercițiu înregistrat încă"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
