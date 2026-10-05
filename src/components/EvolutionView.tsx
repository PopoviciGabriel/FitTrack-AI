import React, { useMemo } from "react";
import { 
  TrendingUp, 
  Dumbbell, 
  Trophy, 
  Flame, 
  CheckCircle2,
  Sparkles,
  RotateCcw
} from "lucide-react";
import { Workout, ExerciseEntry, Set, TimelineSession, CustomMuscleGroup, PRESET_EXERCISES } from "../types";
import { cn } from "../lib/utils";
import {
  buildDailySessions,
  findPreviousDayEntry,
  parseDateToTimestamp,
} from "../services/algorithmService";
import { customGroupToAnalyticsCategory, isCustomExerciseId } from "../services/exerciseService";

export interface EvolutionViewProps {
  workouts: Workout[];
  theme: "light" | "dark";
  onUpgradeClick?: () => void;
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
export function getMuscleCategoryForEntry(
  exerciseName: string,
  exerciseId?: string,
  customMuscleGroup?: CustomMuscleGroup
): string {
  if (customMuscleGroup) return customGroupToAnalyticsCategory(customMuscleGroup);

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
    /\babs?\b/.test(normName) || normName.includes("abdom") || normName.includes("crunch") || normName.includes("plank") ||
    normName.includes("core") || normName.includes("woodchopper") || normName.includes("leg raise")
  ) {
    return "Abdomen";
  }

  return "Alte Grupe";
}

export { parseDateToTimestamp };

/** Heaviest set (ties broken by reps) among sets that carry any data. */
function getBestSet(sets: Set[]): { weight: number; reps: number } {
  let weight = 0;
  let reps = 0;
  for (const s of sets) {
    if (!(s.completed || s.weight > 0 || s.reps > 0)) continue;
    const w = s.weight || 0;
    const r = s.reps || 0;
    if (w > weight || (w === weight && r > reps)) {
      weight = w;
      reps = r;
    }
  }
  return { weight, reps };
}

/**
 * Resolves the 100% complete, untruncated exercise name.
 * Prevents cut-offs (such as "lat..." or "mașini shoulder...") and ensures pristine AI-grade display.
 */
export function resolveFullExerciseName(rawName: string, exerciseId?: string): string {
  if (!rawName) return "";
  const clean = rawName.replace(/\.{2,}$/, "").trim();

  // User-created exercises keep their exact name: the fuzzy matching below could rewrite it into a preset.
  if (isCustomExerciseId(exerciseId)) return clean;

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

  if (norm.includes("tricep") || norm.includes("triceps")) {
    if (norm.includes("extension") || norm.includes("extens")) {
      return "Triceps Overhead Extension";
    }
    if (norm.includes("pushdown") || norm.includes("cablu")) {
      return "Triceps Pushdown";
    }
    return "Triceps Overhead Extension";
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
  // 1. One session per workout per calendar day (same-day edits are merged into the last state)
  const allChronologicalWorkouts = useMemo<TimelineSession[]>(
    () => buildDailySessions(workouts),
    [workouts]
  );

  // 2. Compute Tonnage per session for Total Tonnage tracking
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
            topEx = resolveFullExerciseName(e.name, e.exerciseId);
          }
        });
      });

      return {
        workoutId: `${w.workoutKey}-${w.dayKey}`,
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

  // 3. Comprehensive Workout-to-Workout Progression for the Latest Workout Session
  const latestWorkoutAnalysis = useMemo(() => {
    if (allChronologicalWorkouts.length === 0) return null;
    const latestW = allChronologicalWorkouts[allChronologicalWorkouts.length - 1];

    const exercisesAnalysis = latestW.entries.map((entry) => {
      const canonicalName = resolveFullExerciseName(entry.name || "", entry.exerciseId);

      const validCurrentSets = entry.sets.filter((s) => s.completed || s.weight > 0 || s.reps > 0);
      let curBestW = 0;
      let curBestR = 0;
      validCurrentSets.forEach((s) => {
        const w = s.weight || 0;
        const r = s.reps || 0;
        if (w > curBestW || (w === curBestW && r > curBestR)) {
          curBestW = w;
          curBestR = r;
        }
      });

      // Compare only with the latest session from an EARLIER calendar day:
      // edits made earlier today are never used as the baseline.
      let prevSession: {
        bestWeight: number;
        bestReps: number;
        workoutTitle: string;
      } | null = null;

      const previous = findPreviousDayEntry(allChronologicalWorkouts, latestW.dayKey, (e) => {
        const prevCanonical = resolveFullExerciseName(e.name || "", e.exerciseId);
        if (prevCanonical.toLowerCase() !== canonicalName.toLowerCase()) return false;
        const best = getBestSet(e.sets);
        return best.weight > 0 || best.reps > 0;
      });

      if (previous) {
        const best = getBestSet(previous.entry.sets);
        prevSession = {
          bestWeight: best.weight,
          bestReps: best.reps,
          workoutTitle: previous.session.title,
        };
      }

      let diffWeight = 0;
      let diffReps = 0;
      let status: "improved" | "maintained" | "regressed" | "new" = "new";

      if (prevSession) {
        diffWeight = Math.round((curBestW - prevSession.bestWeight) * 10) / 10;
        diffReps = curBestR - prevSession.bestReps;

        if (diffWeight > 0 || (diffWeight === 0 && diffReps > 0)) {
          status = "improved";
        } else if (diffWeight === 0 && diffReps === 0) {
          status = "maintained";
        } else {
          status = "regressed";
        }
      }

      return {
        exerciseName: canonicalName,
        currentWeight: curBestW,
        currentReps: curBestR,
        prevSession,
        diffWeight,
        diffReps,
        status,
        category: getMuscleCategoryForEntry(canonicalName, entry.exerciseId, entry.muscleGroup),
      };
    }).filter((ex) => ex.currentWeight > 0 || ex.currentReps > 0);

    const improvedCount = exercisesAnalysis.filter((e) => e.status === "improved").length;
    const maintainedCount = exercisesAnalysis.filter((e) => e.status === "maintained").length;
    const comparedCount = exercisesAnalysis.filter((e) => e.prevSession !== null).length;

    return {
      workoutTitle: latestW.title,
      exercises: exercisesAnalysis,
      improvedCount,
      maintainedCount,
      comparedCount,
      overloadRatePct: comparedCount > 0 ? Math.round((improvedCount / comparedCount) * 100) : 100,
    };
  }, [allChronologicalWorkouts]);

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

        const category = getMuscleCategoryForEntry(fullExerciseName, entry.exerciseId, entry.muscleGroup);

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
        <div className="flex justify-between items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-zinc-50 uppercase leading-none">
              EVOLUȚIE
            </h1>
            <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.25em] min-[400px]:tracking-[0.3em] sm:tracking-[0.4em] mt-1.5 leading-snug break-words">
              Progres Sesiune de la Sesiune
            </p>
          </div>
        </div>
      </header>

      {/* Global Performance Summary Cards */}
      <div className="grid grid-cols-2 gap-3.5 px-1">
        {/* Tonaj Total */}
        <div className="min-w-0 p-4 sm:p-6 bg-white dark:bg-[#141414] border border-slate-200/60 dark:border-white/5 rounded-[2rem] sm:rounded-[2.5rem] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="min-w-0 text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-slate-400 dark:text-zinc-500">
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
        <div className="min-w-0 p-4 sm:p-6 bg-white dark:bg-[#141414] border border-slate-200/60 dark:border-white/5 rounded-[2rem] sm:rounded-[2.5rem] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="min-w-0 text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-slate-400 dark:text-zinc-500">
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

      {/* 2026 MODERN PROGRES SESIUNE DE LA SESIUNE & ANALIZĂ GLOBALĂ ANTRENAMENT */}
      <div className="p-4 sm:p-7 bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-white/[0.08] rounded-[2rem] sm:rounded-[2.5rem] shadow-sm space-y-5 sm:space-y-6 mx-1 relative overflow-hidden">
        {/* Subtle ambient accent */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/5 dark:bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-2xl bg-blue-500/10 dark:bg-orange-500/10 border border-blue-500/20 dark:border-orange-500/20 flex items-center justify-center text-blue-600 dark:text-orange-500 shrink-0 shadow-2xs">
              <TrendingUp className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-base sm:text-xl text-slate-950 dark:text-white uppercase tracking-tight leading-tight break-words">
                Progres Sesiune de la Sesiune
              </h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5 break-words">
                Analiză globală antrenament · Comparație exactă greutate &amp; repetări
              </p>
            </div>
          </div>
          {latestWorkoutAnalysis && (
            <div className="self-start sm:self-center min-w-0 max-w-full sm:shrink-0">
              <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-xl bg-blue-50/80 dark:bg-orange-500/10 text-blue-600 dark:text-orange-400 border border-blue-200/60 dark:border-orange-500/20 inline-flex max-w-full items-start gap-1.5">
                <span className="size-1.5 mt-1.5 rounded-full bg-blue-600 dark:bg-orange-500 shrink-0" />
                <span className="min-w-0 break-words leading-snug">
                  {latestWorkoutAnalysis.workoutTitle}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Analiză Globală Antrenament */}
        {latestWorkoutAnalysis && latestWorkoutAnalysis.exercises.length > 0 ? (
          <div className="space-y-5 relative z-10">
            {/* Global Overload Rate Banner */}
            <div className="p-4 sm:p-6 rounded-[1.75rem] sm:rounded-[2rem] bg-slate-50/90 dark:bg-[#19191d] border border-slate-200/90 dark:border-white/[0.08] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                    Analiză Globală Antrenament
                  </span>
                  <span className="size-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
                  <span className="text-[10px] font-bold text-blue-600 dark:text-orange-500 uppercase tracking-wider">
                    {latestWorkoutAnalysis.exercises.length} exerciții evaluate
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-black text-slate-950 dark:text-white uppercase tracking-tight break-words leading-snug">
                  Progresul Exercițiilor în {latestWorkoutAnalysis.workoutTitle}
                </h4>
                <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 break-words">
                  {latestWorkoutAnalysis.comparedCount > 0 ? (
                    <>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {latestWorkoutAnalysis.improvedCount} din {latestWorkoutAnalysis.comparedCount}
                      </span>{" "}
                      exerciții au progresat în greutate sau repetări față de sesiunea anterioară.
                    </>
                  ) : (
                    "Toate exercițiile din acest antrenament reprezintă baza inițială de referință."
                  )}
                </p>
              </div>

              {/* Overload Metrics Pills/Counters */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="size-3.5" />
                    <span className="text-lg font-black leading-none">
                      {latestWorkoutAnalysis.improvedCount}
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-1">
                    Progres
                  </span>
                </div>

                <div className="px-3.5 py-2 rounded-2xl bg-blue-500/10 dark:bg-orange-500/10 border border-blue-500/20 dark:border-orange-500/20 flex flex-col items-center">
                  <div className="flex items-center gap-1 text-blue-600 dark:text-orange-500">
                    <CheckCircle2 className="size-3.5" />
                    <span className="text-lg font-black leading-none">
                      {latestWorkoutAnalysis.maintainedCount}
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-orange-500 mt-1">
                    Constant
                  </span>
                </div>

                {latestWorkoutAnalysis.comparedCount > 0 && (
                  <div className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-white/5 flex flex-col items-center">
                    <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
                      {latestWorkoutAnalysis.overloadRatePct}%
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 mt-1">
                      Rată Progres
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Exercise-by-Exercise Precision Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {latestWorkoutAnalysis.exercises.map((ex, exIdx) => {
                // Algoritm comparare progresie conform cerințelor:
                // 1. Ghidare în primul rând după numărul de kg
                // 2. Dacă numărul de kg este egal, ghidare după numărul de repetări
                let prevColor: "neutral" | "red" | "blue" = "neutral";
                let curColor: "neutral" | "red" | "blue" = "neutral";

                if (ex.prevSession) {
                  const prevW = ex.prevSession.bestWeight;
                  const prevR = ex.prevSession.bestReps;
                  const curW = ex.currentWeight;
                  const curR = ex.currentReps;

                  if (curW > prevW || (curW === prevW && curR > prevR)) {
                    // Progresie (sesiune precedentă indică mai puțin decât sesiune curentă):
                    // Sesiunea precedentă = roșu, Sesiunea curentă = albastru
                    prevColor = "red";
                    curColor = "blue";
                  } else if (curW < prevW || (curW === prevW && curR < prevR)) {
                    // Scădere (sesiune precedentă e mai mult decât în sesiune curentă):
                    // Sesiunea precedentă = albastru, Sesiunea curentă = roșu
                    prevColor = "blue";
                    curColor = "red";
                  } else {
                    // Constant / stagnare (rezultat egal):
                    // Ambele subchenare = culoare neutră
                    prevColor = "neutral";
                    curColor = "neutral";
                  }
                }

                // Mapare stiluri per stare coloristică
                const themeStyles = {
                  red: {
                    box: "bg-red-50/90 dark:bg-red-950/40 border-red-200/90 dark:border-red-500/30",
                    title: "text-red-700 dark:text-red-400",
                    pill: "bg-white/90 dark:bg-red-900/30 border-red-200/80 dark:border-red-500/30",
                    weight: "text-red-700 dark:text-red-300",
                    kg: "text-red-600/80 dark:text-red-400",
                    multiplier: "text-red-300 dark:text-red-500/50",
                    reps: "text-slate-900 dark:text-white",
                    repsUnit: "text-slate-500 dark:text-zinc-400",
                    zeroRef: "text-red-600/80 dark:text-red-400/80 bg-red-100/60 dark:bg-red-900/30",
                  },
                  blue: {
                    box: "bg-blue-50/90 dark:bg-blue-950/40 border-blue-200/90 dark:border-blue-500/30",
                    title: "text-blue-700 dark:text-blue-400",
                    pill: "bg-white/90 dark:bg-blue-900/30 border-blue-200/80 dark:border-blue-500/30",
                    weight: "text-blue-700 dark:text-blue-400",
                    kg: "text-blue-600/80 dark:text-blue-400",
                    multiplier: "text-blue-300 dark:text-blue-500/50",
                    reps: "text-slate-950 dark:text-white",
                    repsUnit: "text-slate-500 dark:text-zinc-400",
                    zeroRef: "text-blue-600/80 dark:text-blue-400/80 bg-blue-100/60 dark:bg-blue-900/30",
                  },
                  neutral: {
                    box: "bg-slate-100/80 dark:bg-zinc-800/50 border-slate-200/80 dark:border-white/10",
                    title: "text-slate-600 dark:text-zinc-400",
                    pill: "bg-white/90 dark:bg-zinc-700/40 border-slate-200/70 dark:border-white/10",
                    weight: "text-slate-800 dark:text-zinc-200",
                    kg: "text-slate-500 dark:text-zinc-400",
                    multiplier: "text-slate-300 dark:text-zinc-600",
                    reps: "text-slate-800 dark:text-zinc-200",
                    repsUnit: "text-slate-500 dark:text-zinc-400",
                    zeroRef: "text-slate-500 dark:text-zinc-400 bg-slate-200/60 dark:bg-zinc-800/60",
                  },
                };

                const prevStyle = themeStyles[prevColor];
                const curStyle = themeStyles[curColor];

                return (
                  <div
                    key={`${ex.exerciseName}-${exIdx}`}
                    className="min-w-0 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[1.75rem] bg-slate-50/90 dark:bg-[#19191d] border border-slate-200/90 dark:border-white/[0.08] shadow-xs flex flex-col justify-between gap-4 hover:border-blue-500/40 dark:hover:border-orange-500/40 hover:shadow-md transition-all relative overflow-hidden group"
                  >
                    {/* Category Indicator & Status Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="size-2 rounded-full bg-blue-600 dark:bg-orange-500 shrink-0 shadow-xs" />
                        <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-orange-400 truncate">
                          {ex.category}
                        </span>
                      </div>

                      {ex.status === "improved" ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 whitespace-nowrap">
                          <Sparkles className="size-3" />
                          {ex.diffWeight > 0 ? `+${ex.diffWeight} kg` : `+${ex.diffReps} reps`} · Progres
                        </span>
                      ) : ex.status === "maintained" ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0 whitespace-nowrap">
                          <CheckCircle2 className="size-3" />
                          = Constant
                        </span>
                      ) : ex.status === "regressed" ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 whitespace-nowrap">
                          <RotateCcw className="size-3" />
                          {ex.diffWeight < 0 ? `${ex.diffWeight} kg` : `${ex.diffReps} reps`} · Deload
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 shrink-0">
                          Sesiune nouă
                        </span>
                      )}
                    </div>

                    {/* Exercise Title */}
                    <div className="space-y-1 min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 block">
                        Exercițiu
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight leading-snug break-words">
                        {ex.exerciseName}
                      </h4>
                    </div>

                    {/* Symmetrical Two-Box Comparison: Anterior vs Curent */}
                    <div className="pt-3 border-t border-slate-200/80 dark:border-white/5 grid grid-cols-2 gap-2.5 sm:gap-3">
                      {/* Sesiune Precedentă */}
                      <div className={`p-2.5 sm:p-3.5 rounded-2xl ${prevStyle.box} flex flex-col items-center justify-between text-center min-w-0 shadow-2xs transition-all`}>
                        <div className="w-full flex flex-col items-center text-center mb-2 min-w-0">
                          <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wide leading-tight ${prevStyle.title} block text-center whitespace-normal`}>
                            Sesiune Precedentă
                          </span>
                        </div>

                        <div className="w-full flex items-center justify-center min-w-0">
                          {ex.prevSession ? (
                            <div className={`inline-flex items-center justify-center flex-wrap gap-x-1.5 gap-y-0.5 px-2 sm:px-2.5 py-1.5 rounded-xl ${prevStyle.pill} max-w-full text-center`}>
                              <div className="inline-flex items-baseline gap-0.5 shrink-0">
                                <span className={`text-base sm:text-lg font-black ${prevStyle.weight} tracking-tight leading-none`}>
                                  {ex.prevSession.bestWeight}
                                </span>
                                <span className={`text-[10px] font-bold ${prevStyle.kg} uppercase`}>
                                  kg
                                </span>
                              </div>
                              <span className={`${prevStyle.multiplier} text-xs font-bold select-none shrink-0`}>
                                ×
                              </span>
                              <div className="inline-flex items-baseline gap-0.5 shrink-0">
                                <span className={`text-sm sm:text-base font-black ${prevStyle.reps} tracking-tight leading-none`}>
                                  {ex.prevSession.bestReps}
                                </span>
                                <span className={`text-[10px] font-medium ${prevStyle.repsUnit} lowercase`}>
                                  reps
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-semibold ${prevStyle.zeroRef} italic text-center`}>
                              Referință zero
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sesiune Curentă */}
                      <div className={`p-2.5 sm:p-3.5 rounded-2xl ${curStyle.box} flex flex-col items-center justify-between text-center min-w-0 shadow-2xs transition-all`}>
                        <div className="w-full flex flex-col items-center text-center mb-2 min-w-0">
                          <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wide leading-tight ${curStyle.title} block text-center whitespace-normal`}>
                            Sesiune Curentă
                          </span>
                        </div>

                        <div className="w-full flex items-center justify-center min-w-0">
                          <div className={`inline-flex items-center justify-center flex-wrap gap-x-1.5 gap-y-0.5 px-2 sm:px-2.5 py-1.5 rounded-xl ${curStyle.pill} max-w-full text-center`}>
                            <div className="inline-flex items-baseline gap-0.5 shrink-0">
                              <span className={`text-base sm:text-lg font-black ${curStyle.weight} tracking-tight leading-none`}>
                                {ex.currentWeight}
                              </span>
                              <span className={`text-[10px] font-bold ${curStyle.kg} uppercase`}>
                                kg
                              </span>
                            </div>
                            <span className={`${curStyle.multiplier} text-xs font-bold select-none shrink-0`}>
                              ×
                            </span>
                            <div className="inline-flex items-baseline gap-0.5 shrink-0">
                              <span className={`text-sm sm:text-base font-black ${curStyle.reps} tracking-tight leading-none`}>
                                {ex.currentReps}
                              </span>
                              <span className={`text-[10px] font-medium ${curStyle.repsUnit} lowercase`}>
                                reps
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400 dark:text-zinc-500 text-xs italic">
            Înregistrează antrenamente în Jurnal pentru a vizualiza analiza globală a progresului de la sesiune la sesiune.
          </div>
        )}
      </div>

      {/* STRENGTH RECORDS PER MUSCLE GROUP (EXCLUSIV CEL MAI SOLICITANT EXERCIȚIU & RECORDUL MAXIM) */}
      <div className="p-4 sm:p-7 bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-white/[0.08] rounded-[2rem] sm:rounded-[2.5rem] shadow-sm space-y-5 mx-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Trophy className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-base sm:text-xl text-slate-950 dark:text-white uppercase tracking-tight leading-tight break-words">
                Recorduri de Forță per Grupă Musculară
              </h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5 break-words">
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
              className="min-w-0 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[1.75rem] bg-slate-50/90 dark:bg-[#19191d] border border-slate-200/90 dark:border-white/[0.08] shadow-xs flex flex-col justify-between gap-4 hover:border-blue-500/40 dark:hover:border-orange-500/40 hover:shadow-md transition-all group relative overflow-hidden"
            >
              {/* Subtle ambient accent on hover */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-orange-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 dark:group-hover:bg-orange-500/10 transition-colors" />

              {/* Top Row: Full Muscle Group Name & Record Badge */}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-2.5 rounded-full bg-blue-600 dark:bg-orange-500 shrink-0 shadow-xs" />
                  <span className="min-w-0 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-zinc-100 break-words">
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
              <div className="pt-3.5 border-t border-slate-200/80 dark:border-white/5 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                    Performanță Maximă
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                    Sarcina de vârf
                  </span>
                </div>
                <div className="text-right min-w-0 max-w-full">
                  <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 justify-end">
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
