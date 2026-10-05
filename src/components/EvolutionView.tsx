import React, { useState, useMemo } from "react";
import { 
  TrendingUp, 
  Dumbbell, 
  Trophy, 
  Flame, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight,
  BarChart3,
  CheckCircle2,
  Sparkles,
  RotateCcw
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
import { Workout, ExerciseEntry, Set, PRESET_EXERCISES } from "../types";
import { cn, formatDate } from "../lib/utils";

export interface EvolutionViewProps {
  workouts: Workout[];
  theme: "light" | "dark";
  onUpgradeClick?: () => void;
}

interface ExerciseSessionPoint {
  workoutId: string;
  workoutTitle: string;
  date: string;
  timestamp: number;
  bestWeight: number;
  bestReps: number;
  totalSets: number;
  totalVolume: number;
  sets: Set[];
}

interface ExerciseProgression {
  exerciseName: string;
  exerciseId?: string;
  sessions: ExerciseSessionPoint[];
  latestSession: ExerciseSessionPoint;
  previousSession?: ExerciseSessionPoint;
  peakWeight: number;
  peakRepsAtPeakWeight: number;
  totalSessions: number;
  // Progress from previous session to latest session
  diffWeight: number;
  diffReps: number;
  progressStatus: "improved" | "maintained" | "regressed" | "first_session";
}

interface SessionTonnagePoint {
  workoutId: string;
  title: string;
  date: string;
  timestamp: number;
  totalTonnage: number;
  totalSets: number;
  totalReps: number;
  topExerciseName: string;
  topExerciseSet: string;
}

/**
 * Robust muscle group classification inspired directly by the Journal exercise database (PRESET_EXERCISES)
 * and rich keyword fallbacks for custom-named or imported exercises.
 */
export function getMuscleCategoryForEntry(exerciseName: string, exerciseId?: string): string {
  const normName = exerciseName.trim().toLowerCase();

  // 1. Precise lookup in Jurnal's PRESET_EXERCISES database
  const preset = PRESET_EXERCISES.find(p => 
    (exerciseId && p.id.toLowerCase() === exerciseId.toLowerCase()) ||
    p.name.toLowerCase() === normName ||
    p.id.toLowerCase() === normName.replace(/[^a-z0-9]/g, "-")
  );

  if (preset) {
    const cat = preset.category;
    if (cat.includes("Chest") || cat.includes("Piept")) return "Piept";
    if (cat.includes("Back") || cat.includes("Spate")) return "Spate";
    if (cat.includes("Shoulders") || cat.includes("Umeri")) return "Umeri";
    if (cat === "Biceps") return "Biceps";
    if (cat === "Triceps") return "Triceps";
    if (cat.includes("Quadriceps") || cat.includes("Cvadricepși")) return "Cvadricepși";
    if (cat.includes("Hamstrings") || cat.includes("Femurali")) return "Femurali";
    if (cat.includes("Glutes") || cat.includes("Fesieri")) return "Fesieri";
    if (cat.includes("Calves") || cat.includes("Gambe")) return "Gambe";
    if (cat.includes("ADDUCTORS") || cat.includes("Aductori")) return "Aductori";
    if (cat.includes("Forearms") || cat.includes("Antebrațe")) return "Antebrațe";
    if (cat.includes("Core") || cat.includes("Abdomen")) return "Abdomen";
    if (cat.includes("Olympic") || cat.includes("Full Body")) return "Full Body / Olimpic";
    return cat;
  }

  // 2. Keyword fallback for custom-named or imported exercises:
  // Check Shoulders first (prevent Upright Row / Face-Pull from falling into Back)
  if (
    normName.includes("umeri") || normName.includes("shoulder") || normName.includes("overhead") ||
    normName.includes("military") || normName.includes("militar") || normName.includes("arnold") ||
    normName.includes("lateral") || normName.includes("delt") || normName.includes("face-pull") ||
    normName.includes("face pull") || normName.includes("upright row") || normName.includes("ramat vertical") ||
    normName.includes("trapez") || normName.includes("shrug") || normName.includes("ridicari laterale") ||
    normName.includes("fluturari umeri") || normName.includes("z-press") || normName.includes("bradford") ||
    normName.includes("savickas") || normName.includes("landmine press")
  ) {
    return "Umeri";
  }

  // Check Chest
  if (
    normName.includes("piept") || normName.includes("chest") || normName.includes("bench") ||
    normName.includes("incline") || normName.includes("decline") || normName.includes("flotari") ||
    normName.includes("push-up") || normName.includes("pec") || normName.includes("pullover") ||
    normName.includes("guillotine") || normName.includes("hex press")
  ) {
    return "Piept";
  }

  // Check Biceps
  if (
    normName.includes("biceps") || normName.includes("curl") || normName.includes("flexii") ||
    normName.includes("preacher") || normName.includes("scott") || normName.includes("zottman")
  ) {
    return "Biceps";
  }

  // Check Triceps
  if (
    normName.includes("triceps") || normName.includes("skullcrusher") || normName.includes("pushdown") ||
    normName.includes("katana") || normName.includes("french") || normName.includes("jm press") ||
    normName.includes("tate") || normName.includes("kickback") || normName.includes("dips") || normName.includes("dip")
  ) {
    return "Triceps";
  }

  // Check Quadriceps
  if (
    normName.includes("quad") || normName.includes("cvadriceps") || normName.includes("squat") ||
    normName.includes("genuflex") || normName.includes("leg press") || normName.includes("presa picioare") ||
    normName.includes("hack squat") || normName.includes("leg extension") || normName.includes("fandari") ||
    normName.includes("lunge") || normName.includes("sissy")
  ) {
    return "Cvadricepși";
  }

  // Check Hamstrings
  if (
    normName.includes("femural") || normName.includes("hamstring") || normName.includes("rdl") ||
    normName.includes("leg curl") || normName.includes("nordic") || normName.includes("ghr")
  ) {
    return "Femurali";
  }

  // Check Glutes
  if (
    normName.includes("fesier") || normName.includes("glute") || normName.includes("hip thrust") ||
    normName.includes("thrust") || normName.includes("bridge") || normName.includes("abduct")
  ) {
    return "Fesieri";
  }

  // Check Calves
  if (
    normName.includes("gambe") || normName.includes("calf") || normName.includes("calves") ||
    normName.includes("tibie") || normName.includes("tibialis")
  ) {
    return "Gambe";
  }

  // Check Back
  if (
    normName.includes("spate") || normName.includes("back") || normName.includes("row") ||
    normName.includes("ramat") || normName.includes("tractiuni") || normName.includes("pull-up") ||
    normName.includes("chin-up") || normName.includes("lat") || normName.includes("pulldown") ||
    normName.includes("deadlift") || normName.includes("indreptari") || normName.includes("good morning") ||
    normName.includes("hiperextensii")
  ) {
    return "Spate";
  }

  // Check Adductors
  if (normName.includes("aductor") || normName.includes("adduct") || normName.includes("copenhagen")) {
    return "Aductori";
  }

  // Check Forearms
  if (normName.includes("antrebrat") || normName.includes("forearm") || normName.includes("wrist") || normName.includes("farmer")) {
    return "Antebrațe";
  }

  // Check Abs & Core
  if (
    normName.includes("ab") || normName.includes("crunch") || normName.includes("plank") ||
    normName.includes("core") || normName.includes("woodchopper") || normName.includes("leg raise")
  ) {
    return "Abdomen";
  }

  return "Alte Grupe";
}

/**
 * Resolves the 100% complete, untruncated exercise name.
 * Prevents cut-offs (such as "lat..." or "mașini shoulder...") and ensures pristine AI-grade display.
 */
export function resolveFullExerciseName(rawName: string, exerciseId?: string): string {
  if (!rawName) return "";
  const clean = rawName.replace(/\.{2,}$/, "").trim();

  // 1. By explicit exerciseId in PRESET_EXERCISES
  if (exerciseId) {
    const matchId = PRESET_EXERCISES.find(p => p.id.toLowerCase() === exerciseId.toLowerCase());
    if (matchId) return matchId.name;
  }

  // 2. Exact match against PRESET_EXERCISES names
  const matchExact = PRESET_EXERCISES.find(p => p.name.toLowerCase() === clean.toLowerCase());
  if (matchExact) return matchExact.name;

  // 3. Normalized matching for shortened / truncated names (e.g. "lat...", "lat pulldown", "masini shoulder")
  const norm = clean.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();

  if (norm.startsWith("lat pull") || norm === "lat" || norm.startsWith("lat ")) {
    return "Lat Pulldown (Wide Grip)";
  }

  if (norm.includes("shoulder") && (norm.includes("masin") || norm.includes("machin") || norm.includes("press"))) {
    return "Machine Shoulder Press";
  }

  // Prefix match against presets
  const matchPrefix = PRESET_EXERCISES.find(p => {
    const pNorm = p.name.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    return pNorm === norm || pNorm.startsWith(norm);
  });
  if (matchPrefix && norm.length >= 3) {
    return matchPrefix.name;
  }

  return clean;
}

export const EvolutionView = ({ 
  workouts, 
  theme 
}: EvolutionViewProps) => {
  const [timeframe, setTimeframe] = useState<"all" | "90" | "30">("all");
  const [searchExercise, setSearchExercise] = useState<string>("");
  const [selectedExerciseName, setSelectedExerciseName] = useState<string | null>(null);

  // 1. Process all chronological sessions from workouts (including history snapshots)
  const allChronologicalWorkouts = useMemo(() => {
    const list: {
      workoutId: string;
      title: string;
      date: string;
      timestamp: number;
      entries: ExerciseEntry[];
    }[] = [];

    workouts.forEach((w) => {
      // Historical snapshots
      if (w.history && w.history.length > 0) {
        w.history.forEach((h) => {
          list.push({
            workoutId: `${w.id}-snap-${h.date}`,
            title: w.title,
            date: h.date,
            timestamp: new Date(h.date).getTime() || 0,
            entries: h.entries,
          });
        });
      }

      // Current workout
      list.push({
        workoutId: w.id,
        title: w.title,
        date: w.date,
        timestamp: new Date(w.date).getTime() || 0,
        entries: w.entries,
      });
    });

    return list.sort((a, b) => a.timestamp - b.timestamp);
  }, [workouts]);

  // 2. Compute Tonnage per session for Total Tonnage tracking & chart
  const timelineTonnage = useMemo<SessionTonnagePoint[]>(() => {
    return allChronologicalWorkouts.map((w) => {
      let ton = 0;
      let setsCount = 0;
      let repsCount = 0;
      let topWeight = 0;
      let topReps = 0;
      let topEx = "";

      w.entries.forEach((e) => {
        const validSets = e.sets.filter((s) => s.completed || s.weight > 0 || s.reps > 0);
        validSets.forEach((s) => {
          const weight = s.weight || 0;
          const reps = s.reps || 0;
          ton += weight * reps;
          setsCount++;
          repsCount += reps;

          if (weight > topWeight || (weight === topWeight && reps > topReps)) {
            topWeight = weight;
            topReps = reps;
            topEx = e.name;
          }
        });
      });

      return {
        workoutId: w.workoutId,
        title: w.title,
        date: w.date,
        timestamp: w.timestamp,
        totalTonnage: Math.round(ton),
        totalSets: setsCount,
        totalReps: repsCount,
        topExerciseName: topEx || "Antrenament",
        topExerciseSet: topWeight > 0 ? `${topWeight} kg × ${topReps} reps` : "--",
      };
    }).filter((t) => t.totalTonnage > 0 || t.totalSets > 0);
  }, [allChronologicalWorkouts]);

  // Filter tonnage timeline by timeframe
  const filteredTonnageTimeline = useMemo(() => {
    if (timeframe === "all") return timelineTonnage;
    const now = Date.now();
    const days = timeframe === "30" ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return timelineTonnage.filter((t) => t.timestamp >= cutoff);
  }, [timelineTonnage, timeframe]);

  // Global aggregate metrics
  const globalMetrics = useMemo(() => {
    let totalTonnage = 0;
    let totalSets = 0;
    let totalReps = 0;
    let peakOverallWeight = 0;
    let peakOverallReps = 0;
    let peakOverallExercise = "";

    timelineTonnage.forEach((t) => {
      totalTonnage += t.totalTonnage;
      totalSets += t.totalSets;
      totalReps += t.totalReps;
    });

    // Scan all exercise peak weights and reps (no 1RM!)
    allChronologicalWorkouts.forEach((w) => {
      w.entries.forEach((e) => {
        e.sets.forEach((s) => {
          const wKg = s.weight || 0;
          const r = s.reps || 0;
          if (wKg > peakOverallWeight || (wKg === peakOverallWeight && r > peakOverallReps)) {
            peakOverallWeight = wKg;
            peakOverallReps = r;
            peakOverallExercise = e.name;
          }
        });
      });
    });

    const averageTonnage = timelineTonnage.length > 0
      ? Math.round(totalTonnage / timelineTonnage.length)
      : 0;

    return {
      totalTonnage,
      totalSets,
      totalReps,
      sessionsCount: timelineTonnage.length,
      averageTonnage,
      peakOverallWeight,
      peakOverallReps,
      peakOverallExercise,
    };
  }, [timelineTonnage, allChronologicalWorkouts]);

  // 3. Workout-to-Workout Exercise Progression Engine (Weight & Reps only, NO 1RM!)
  const exerciseProgressions = useMemo<ExerciseProgression[]>(() => {
    const map = new Map<string, ExerciseSessionPoint[]>();
    const exerciseIdMap = new Map<string, string>();

    allChronologicalWorkouts.forEach((w) => {
      w.entries.forEach((entry) => {
        const cleanName = entry.name.trim();
        if (!cleanName) return;
        if (entry.exerciseId) {
          exerciseIdMap.set(cleanName, entry.exerciseId);
        }

        const validSets = entry.sets.filter((s) => s.completed || s.weight > 0 || s.reps > 0);
        if (validSets.length === 0) return;

        // Find best set in this session (highest weight, or highest reps at equal weight)
        let bestW = 0;
        let bestR = 0;
        let sessionVolume = 0;

        validSets.forEach((s) => {
          const wVal = s.weight || 0;
          const rVal = s.reps || 0;
          sessionVolume += wVal * rVal;
          if (wVal > bestW || (wVal === bestW && rVal > bestR)) {
            bestW = wVal;
            bestR = rVal;
          }
        });

        const list = map.get(cleanName) || [];
        list.push({
          workoutId: w.workoutId,
          workoutTitle: w.title,
          date: w.date,
          timestamp: w.timestamp,
          bestWeight: bestW,
          bestReps: bestR,
          totalSets: validSets.length,
          totalVolume: sessionVolume,
          sets: validSets,
        });
        map.set(cleanName, list);
      });
    });

    const result: ExerciseProgression[] = [];

    map.forEach((sessions, exerciseName) => {
      // Sort sessions chronologically ascending
      sessions.sort((a, b) => a.timestamp - b.timestamp);

      let peakWeight = 0;
      let peakRepsAtPeakWeight = 0;

      sessions.forEach((s) => {
        if (s.bestWeight > peakWeight || (s.bestWeight === peakWeight && s.bestReps > peakRepsAtPeakWeight)) {
          peakWeight = s.bestWeight;
          peakRepsAtPeakWeight = s.bestReps;
        }
      });

      const latestSession = sessions[sessions.length - 1];
      const previousSession = sessions.length >= 2 ? sessions[sessions.length - 2] : undefined;

      let diffWeight = 0;
      let diffReps = 0;
      let progressStatus: "improved" | "maintained" | "regressed" | "first_session" = "first_session";

      if (previousSession) {
        diffWeight = Math.round((latestSession.bestWeight - previousSession.bestWeight) * 10) / 10;
        diffReps = latestSession.bestReps - previousSession.bestReps;

        if (diffWeight > 0 || (diffWeight === 0 && diffReps > 0)) {
          progressStatus = "improved";
        } else if (diffWeight === 0 && diffReps === 0) {
          progressStatus = "maintained";
        } else {
          progressStatus = "regressed";
        }
      }

      result.push({
        exerciseName,
        exerciseId: exerciseIdMap.get(exerciseName),
        sessions,
        latestSession,
        previousSession,
        peakWeight,
        peakRepsAtPeakWeight,
        totalSessions: sessions.length,
        diffWeight,
        diffReps,
        progressStatus,
      });
    });

    // Sort by most recently trained or total sessions
    return result.sort((a, b) => b.latestSession.timestamp - a.latestSession.timestamp);
  }, [allChronologicalWorkouts]);

  // Filter exercises by user search query
  const filteredExercises = useMemo(() => {
    if (!searchExercise.trim()) return exerciseProgressions;
    const query = searchExercise.toLowerCase().trim();
    return exerciseProgressions.filter((e) => e.exerciseName.toLowerCase().includes(query));
  }, [exerciseProgressions, searchExercise]);

  // Active expanded exercise progression details
  const activeExerciseProgression = useMemo(() => {
    if (!selectedExerciseName) {
      return exerciseProgressions.length > 0 ? exerciseProgressions[0] : null;
    }
    return exerciseProgressions.find((e) => e.exerciseName === selectedExerciseName) || exerciseProgressions[0] || null;
  }, [exerciseProgressions, selectedExerciseName]);

  // Format Tonnage Display helper
  const formatTonnage = (kg: number) => {
    if (kg >= 1000) {
      return {
        value: (kg / 1000).toFixed(1),
        unit: "tone",
      };
    }
    return {
      value: kg.toLocaleString("ro-RO"),
      unit: "kg",
    };
  };

  const formattedTonnage = formatTonnage(globalMetrics.totalTonnage);

  // Overall tonnage trend %
  const tonnageTrendPct = useMemo(() => {
    if (filteredTonnageTimeline.length < 2) return null;
    const first = filteredTonnageTimeline[0].totalTonnage;
    const last = filteredTonnageTimeline[filteredTonnageTimeline.length - 1].totalTonnage;
    if (first === 0) return null;
    const pct = ((last - first) / first) * 100;
    return Math.round(pct * 10) / 10;
  }, [filteredTonnageTimeline]);

  // 4. Recorduri de Forță per Grupă Musculară (Algoritm dedicat: ia cel mai solicitant exercițiu per grupă)
  const muscleGroupStrengthRecords = useMemo(() => {
    const standardOrder = [
      "Piept",
      "Spate",
      "Umeri",
      "Biceps",
      "Triceps",
      "Cvadricepși",
      "Femurali",
      "Fesieri",
      "Gambe",
      "Abdomen",
      "Antebrațe",
      "Aductori",
      "Full Body / Olimpic",
    ];

    // Map each muscle group to its leading exercise and maximum strength set
    const groupMap = new Map<
      string,
      {
        category: string;
        topExerciseName: string;
        peakWeight: number;
        peakReps: number;
      }
    >();

    allChronologicalWorkouts.forEach((w) => {
      w.entries.forEach((entry) => {
        const fullExerciseName = resolveFullExerciseName(entry.name || "", entry.exerciseId);
        if (!fullExerciseName) return;

        const category = getMuscleCategoryForEntry(fullExerciseName, entry.exerciseId);

        const validSets = entry.sets.filter((s) => s.completed || s.weight > 0 || s.reps > 0);
        validSets.forEach((s) => {
          const wKg = s.weight || 0;
          const r = s.reps || 0;
          if (wKg <= 0 && r <= 0) return;

          const current = groupMap.get(category);
          if (!current) {
            groupMap.set(category, {
              category,
              topExerciseName: fullExerciseName,
              peakWeight: wKg,
              peakReps: r,
            });
          } else {
            // Evaluăm solicitarea: greutatea maximă ridicată (iar la egalitate, repetările maxime)
            if (wKg > current.peakWeight || (wKg === current.peakWeight && r > current.peakReps)) {
              current.peakWeight = wKg;
              current.peakReps = r;
              current.topExerciseName = fullExerciseName;
            }
          }
        });
      });
    });

    const result: {
      category: string;
      topExerciseName: string;
      peakWeight: number;
      peakReps: number;
    }[] = [];

    // Prioritize standard sports science order for active groups
    standardOrder.forEach((cat) => {
      const data = groupMap.get(cat);
      if (data && data.peakWeight > 0) {
        result.push(data);
      }
    });

    // Add any detected custom categories that have recorded sets
    groupMap.forEach((data, cat) => {
      if (!standardOrder.includes(cat) && data.peakWeight > 0) {
        result.push(data);
      }
    });

    return result;
  }, [allChronologicalWorkouts]);

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
              Progres Sesiune de la Sesiune
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
              {formattedTonnage.value}
            </span>
            <span className="text-xs font-black uppercase text-blue-600 dark:text-orange-500">
              {formattedTonnage.unit}
            </span>
          </div>
          <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 mt-2 truncate">
            ~{globalMetrics.averageTonnage.toLocaleString("ro-RO")} kg / sesiune
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
              {globalMetrics.sessionsCount}
            </span>
            <span className="text-xs font-black uppercase text-slate-400 dark:text-zinc-500">
              total
            </span>
          </div>
          <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 mt-2 truncate">
            {globalMetrics.totalSets} seturi • {globalMetrics.totalReps} repetări
          </p>
        </div>
      </div>

      {/* WORKOUT-TO-WORKOUT PROGRESSION SECTION (SIMPLIFIED AI INTERFACE DESIGN) */}
      <div className="p-6 sm:p-7 bg-white dark:bg-[#141414] border border-slate-200/60 dark:border-white/5 rounded-[2.5rem] shadow-xs space-y-5 mx-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="size-4 text-blue-600 dark:text-orange-500" />
            <h3 className="font-black text-lg text-slate-950 dark:text-white uppercase tracking-tight leading-none">
              Progres Sesiune de la Sesiune
            </h3>
          </div>
          <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
            Comparație directă de greutate și repetări între ultimul antrenament și cel anterior
          </p>
        </div>

        {/* Exercise Quick Selector & Search */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Caută exercițiu (ex: Bench, Presă Umeri, Genuflexiuni, Tracțiuni)..."
              value={searchExercise}
              onChange={(e) => setSearchExercise(e.target.value)}
              className="w-full bg-slate-100 dark:bg-black/50 border border-slate-200/80 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-orange-500 transition-colors"
            />
          </div>

          {filteredExercises.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
              {filteredExercises.slice(0, 10).map((ex) => (
                <button
                  key={ex.exerciseName}
                  onClick={() => setSelectedExerciseName(ex.exerciseName)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer",
                    activeExerciseProgression?.exerciseName === ex.exerciseName
                      ? "bg-blue-600 dark:bg-orange-500 text-white dark:text-black shadow-xs scale-102"
                      : "bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {ex.exerciseName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Exercise Step-by-Step Session Progression Card */}
        {activeExerciseProgression ? (
          <div className="space-y-4">
            {/* Header & AI Assessment Badge */}
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-orange-500">
                    {getMuscleCategoryForEntry(activeExerciseProgression.exerciseName, activeExerciseProgression.exerciseId)}
                  </span>
                  <span className="size-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
                  <span className="text-[10px] text-slate-400 font-bold">
                    {activeExerciseProgression.totalSessions} {activeExerciseProgression.totalSessions === 1 ? "sesiune" : "sesiuni"}
                  </span>
                </div>
                <h4 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight mt-0.5">
                  {activeExerciseProgression.exerciseName}
                </h4>
              </div>

              {/* Status Badge */}
              <div className="shrink-0 self-start sm:self-auto">
                {activeExerciseProgression.previousSession ? (
                  <div
                    className={cn(
                      "px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5 text-xs font-black uppercase tracking-wider border shadow-xs",
                      activeExerciseProgression.progressStatus === "improved"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : activeExerciseProgression.progressStatus === "maintained"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    )}
                  >
                    {activeExerciseProgression.progressStatus === "improved" ? (
                      <>
                        <Sparkles className="size-3.5 shrink-0" />
                        <span>
                          {activeExerciseProgression.diffWeight > 0
                            ? `+${activeExerciseProgression.diffWeight} kg`
                            : `+${activeExerciseProgression.diffReps} reps`} • Progres Reușit
                        </span>
                      </>
                    ) : activeExerciseProgression.progressStatus === "maintained" ? (
                      <>
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        <span>Performanță Menținută</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="size-3.5 shrink-0" />
                        <span>
                          {activeExerciseProgression.diffWeight < 0
                            ? `${activeExerciseProgression.diffWeight} kg`
                            : `${activeExerciseProgression.diffReps} reps`} • Deload / Recuperare
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] font-black uppercase px-3 py-1.5 rounded-xl bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                    Sesiune Inițială
                  </span>
                )}
              </div>
            </div>

            {/* Symmetrical Two-Box Comparison: Previous vs Latest Workout */}
            {activeExerciseProgression.previousSession ? (
              <div className="grid grid-cols-2 gap-3">
                {/* Sesiunea Trecută */}
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-white/5 flex flex-col justify-between">
                  <div className="mb-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                      Data Trecută
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {formatDate(activeExerciseProgression.previousSession.date)}
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-slate-700 dark:text-zinc-300 tracking-tight">
                      {activeExerciseProgression.previousSession.bestWeight} kg
                    </p>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      × {activeExerciseProgression.previousSession.bestReps} repetări
                    </p>
                  </div>
                </div>

                {/* Sesiunea Curentă (Accent High-Contrast) */}
                <div className="p-5 rounded-3xl bg-blue-50/50 dark:bg-orange-500/[0.04] border border-blue-200 dark:border-orange-500/20 flex flex-col justify-between shadow-xs">
                  <div className="mb-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-orange-500 block">
                      Ultima Dată
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {formatDate(activeExerciseProgression.latestSession.date)}
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-orange-500 tracking-tight">
                      {activeExerciseProgression.latestSession.bestWeight} kg
                    </p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                      × {activeExerciseProgression.latestSession.bestReps} repetări
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Clean Timeline List of Sessions for this exercise */}
            <div className="pt-1 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                Istoric Antrenamente ({activeExerciseProgression.sessions.length}):
              </span>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {[...activeExerciseProgression.sessions].reverse().map((session, sIdx, arr) => {
                  const olderSession = arr[sIdx + 1];
                  let diffLabel = "";
                  let isPositive = false;

                  if (olderSession) {
                    const wDiff = Math.round((session.bestWeight - olderSession.bestWeight) * 10) / 10;
                    const rDiff = session.bestReps - olderSession.bestReps;
                    if (wDiff > 0) diffLabel = `+${wDiff} kg`;
                    else if (wDiff < 0) diffLabel = `${wDiff} kg`;

                    if (rDiff > 0) diffLabel += (diffLabel ? ", " : "") + `+${rDiff} reps`;
                    else if (rDiff < 0) diffLabel += (diffLabel ? ", " : "") + `${rDiff} reps`;

                    if (wDiff === 0 && rDiff === 0) diffLabel = "= Constant";
                    isPositive = wDiff > 0 || (wDiff === 0 && rDiff > 0);
                  }

                  return (
                    <div
                      key={session.workoutId}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-slate-900 dark:text-white block truncate">
                          {formatDate(session.date)}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {session.workoutTitle}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-black text-slate-900 dark:text-white">
                          {session.bestWeight} kg × {session.bestReps} reps
                        </span>

                        {diffLabel ? (
                          <span
                            className={cn(
                              "text-[9px] font-black px-2 py-0.5 rounded-lg border",
                              isPositive
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : diffLabel === "= Constant"
                                ? "bg-slate-200/50 dark:bg-zinc-800 text-slate-500 border-transparent"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            )}
                          >
                            {diffLabel}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 uppercase px-1.5 py-0.5 bg-slate-200/50 dark:bg-zinc-800 rounded-md">
                            Bază
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs italic">
            Nu au fost găsite exerciții conform filtrului.
          </div>
        )}
      </div>

      {/* TOTAL TONNAGE INTERACTIVE CHART */}
      <div className="p-7 bg-white dark:bg-[#141414] border border-slate-200/60 dark:border-white/5 rounded-[2.5rem] shadow-xs space-y-5 mx-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-blue-600 dark:text-orange-500" />
              <h3 className="font-black text-lg text-slate-950 dark:text-white uppercase tracking-tight leading-none">
                Evoluție Tonaj per Sesiune
              </h3>
            </div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1">
              Volumul total ridicat (greutate × repetări) calculat pentru fiecare antrenament
            </p>
          </div>

          {tonnageTrendPct !== null && (
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider self-start sm:self-auto",
              tonnageTrendPct >= 0 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}>
              {tonnageTrendPct >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {tonnageTrendPct >= 0 ? `+${tonnageTrendPct}% progres` : `${tonnageTrendPct}%`}
            </span>
          )}
        </div>

        {/* Recharts Area Chart */}
        <div className="h-64 w-full pt-2">
          {filteredTonnageTimeline.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredTonnageTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tonnageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme === "dark" ? "#f97316" : "#2563eb"} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={theme === "dark" ? "#f97316" : "#2563eb"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#27272a" : "#f1f5f9"} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(d) => formatDate(d)} 
                  stroke={theme === "dark" ? "#52525b" : "#94a3b8"} 
                  fontSize={9} 
                  tickLine={false}
                />
                <YAxis 
                  stroke={theme === "dark" ? "#52525b" : "#94a3b8"} 
                  fontSize={9} 
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}t` : `${v}kg`)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as SessionTonnagePoint;
                      return (
                        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 rounded-2xl shadow-xl text-xs space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{formatDate(data.date)}</p>
                          <p className="font-black text-slate-900 dark:text-white">{data.title}</p>
                          <p className="text-blue-600 dark:text-orange-500 font-black">
                            Tonaj: {data.totalTonnage.toLocaleString("ro-RO")} kg
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                            Cel mai bun set: {data.topExerciseName} ({data.topExerciseSet})
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="totalTonnage" 
                  stroke={theme === "dark" ? "#f97316" : "#2563eb"} 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#tonnageGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-zinc-600 text-xs italic">
              Înregistrează cel puțin 2 antrenamente pentru a genera graficul evoluției tonajului.
            </div>
          )}
        </div>
      </div>

      {/* STRENGTH RECORDS PER MUSCLE GROUP (EXCLUSIV CEL MAI SOLICITANT EXERCIȚIU & RECORDUL MAXIM) */}
      <div className="p-6 sm:p-7 bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-white/[0.08] rounded-[2.5rem] shadow-sm space-y-5 mx-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Trophy className="size-5" />
            </div>
            <div>
              <h3 className="font-black text-lg sm:text-xl text-slate-950 dark:text-white uppercase tracking-tight leading-tight">
                Recorduri de Forță per Grupă Musculară
              </h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5">
                Cel mai solicitant exercițiu și recordul maxim înregistrat pentru fiecare grupă activă
              </p>
            </div>
          </div>
          <div className="self-start sm:self-center shrink-0">
            <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border border-slate-200/60 dark:border-white/10">
              {muscleGroupStrengthRecords.length} {muscleGroupStrengthRecords.length === 1 ? "grupă activă" : "grupe active"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {muscleGroupStrengthRecords.map((group) => (
            <div
              key={group.category}
              className="p-5 sm:p-6 rounded-[1.75rem] bg-slate-50/90 dark:bg-[#19191d] border border-slate-200/90 dark:border-white/[0.08] shadow-xs flex flex-col justify-between gap-4 hover:border-blue-500/40 dark:hover:border-orange-500/40 hover:shadow-md transition-all group relative overflow-hidden"
            >
              {/* Subtle ambient accent on hover */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-orange-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 dark:group-hover:bg-orange-500/10 transition-colors" />

              {/* Top Row: Full Muscle Group Name & Record Badge */}
              <div className="flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-2.5 rounded-full bg-blue-600 dark:bg-orange-500 shrink-0 shadow-xs" />
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-zinc-100 break-words">
                    {group.category}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider shrink-0">
                  <Trophy className="size-3 shrink-0" />
                  <span>Record Vârf</span>
                </div>
              </div>

              {/* Middle Section: Full Exercise Name - 100% Complete, No Ellipsis, Modern AI Typography */}
              <div className="space-y-1.5 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 block">
                  Exercițiul Lider
                </span>
                <h4 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight leading-snug break-words whitespace-normal">
                  {group.topExerciseName}
                </h4>
              </div>

              {/* Bottom Row: Peak Strength Stats (Weight & Reps) */}
              <div className="pt-3.5 border-t border-slate-200/80 dark:border-white/5 flex items-end justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                    Performanță Maximă
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                    Sarcina de vârf
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-baseline gap-1.5 justify-end">
                    <span className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight leading-none">
                      {group.peakWeight}
                    </span>
                    <span className="text-xs font-black text-blue-600 dark:text-orange-500 uppercase">
                      kg
                    </span>
                    <span className="text-slate-300 dark:text-zinc-700 font-bold mx-0.5 select-none">×</span>
                    <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-zinc-100 leading-none">
                      {group.peakReps}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 lowercase">
                      reps
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {muscleGroupStrengthRecords.length === 0 && (
            <div className="col-span-full py-10 text-center text-slate-400 dark:text-zinc-500 text-xs italic">
              Niciun exercițiu înregistrat încă în Jurnal.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
