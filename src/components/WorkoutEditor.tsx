import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  ChevronLeft, 
  ChevronUp,
  ChevronDown,
  Edit2, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Circle, 
  Search, 
  ChevronRight, 
  Trophy, 
  Zap,
  Check,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  Workout,
  ExerciseEntry,
  Exercise,
  Set,
  OverloadSuggestion,
  CustomExercise,
  CustomMuscleGroup,
  CUSTOM_MUSCLE_GROUPS,
} from "../types";
import { cn } from "../lib/utils";
import {
  describeOverloadTarget,
  getOverloadSuggestion,
  isFromAnotherDay,
  resetCompletedSets,
  shouldResetStaleSession,
  toLocalDayKey,
} from "../services/algorithmService";
import { loadCustomExercises, MAX_EXERCISE_NAME_LENGTH } from "../services/storageService";
import {
  buildExerciseCatalog,
  createCustomExercise,
  deleteCustomExercise,
  filterExercises,
} from "../services/exerciseService";
import { DEFAULT_REST_SECONDS, startRestTimer } from "../services/restTimerService";
import { SetRow } from "./SetRow";
import { RestTimer } from "./RestTimer";

export interface WorkoutEditorProps {
  key?: React.Key;
  onSave: (w: Workout) => void;
  onCancel: () => void;
  initialWorkout?: Workout;
  allWorkouts?: Workout[];
  onSetCompleted?: () => void;
}

/** Deep copy of the workout's entries; a workout from an earlier day starts again with every set unchecked. */
const buildInitialEntries = (workout?: Workout): ExerciseEntry[] => {
  if (!workout?.entries) return [];
  const copy: ExerciseEntry[] = JSON.parse(JSON.stringify(workout.entries));
  return isFromAnotherDay(workout.date) ? resetCompletedSets(copy) : copy;
};

export const WorkoutEditor = ({ 
  onSave, 
  onCancel, 
  initialWorkout, 
  allWorkouts = [],
  onSetCompleted 
}: WorkoutEditorProps) => {
  const [title, setTitle] = useState(initialWorkout?.title || "Antrenament Forță");
  const [entries, setEntries] = useState<ExerciseEntry[]>(() => buildInitialEntries(initialWorkout));

  // A saved workout re-opened on a later day is a new session: its stored sets are last session's history.
  const isNewDaySession = useMemo(
    () => !!initialWorkout && isFromAnotherDay(initialWorkout.date),
    [initialWorkout?.id, initialWorkout?.date]
  );
  const historyExcludeId = isNewDaySession ? undefined : initialWorkout?.id;
  const [showSearch, setShowSearch] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const [customExercises, setCustomExercises] = useState<CustomExercise[]>(() => loadCustomExercises());
  const [searchQuery, setSearchQuery] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customGroup, setCustomGroup] = useState<CustomMuscleGroup>(CUSTOM_MUSCLE_GROUPS[0]);
  const [customError, setCustomError] = useState<string | null>(null);

  const exerciseCatalog = useMemo(() => buildExerciseCatalog(customExercises), [customExercises]);
  const visibleExercises = useMemo(
    () => filterExercises(exerciseCatalog, searchQuery),
    [exerciseCatalog, searchQuery]
  );

  useEffect(() => {
    if (showSearch) {
      if (listContainerRef.current) {
        listContainerRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    } else {
      setSearchQuery("");
      setShowCustomForm(false);
    }
  }, [showSearch]);

  const openCustomForm = () => {
    setCustomName(searchQuery.trim().slice(0, MAX_EXERCISE_NAME_LENGTH));
    setCustomGroup(CUSTOM_MUSCLE_GROUPS[0]);
    setCustomError(null);
    setShowCustomForm(true);
  };

  const closeCustomForm = () => {
    setShowCustomForm(false);
    setCustomError(null);
  };

  const handleCreateCustomExercise = (e: React.FormEvent) => {
    e.preventDefault();
    const result = createCustomExercise(customName, customGroup, customExercises);
    if ("error" in result) {
      setCustomError(result.error);
      return;
    }
    setCustomExercises(result.exercises);
    setSearchQuery("");
    setShowCustomForm(false);
    setCustomError(null);
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  };

  const handleDeleteCustomExercise = (exercise: Exercise) => {
    if (!window.confirm(`Ștergi exercițiul custom "${exercise.name}"? Antrenamentele salvate nu sunt afectate.`)) return;
    setCustomExercises(deleteCustomExercise(exercise.id, customExercises));
  };

  useEffect(() => {
    if (initialWorkout?.entries) {
      setEntries(buildInitialEntries(initialWorkout));
    }
    if (initialWorkout?.title) {
      setTitle(initialWorkout.title);
    }
  }, [initialWorkout]);

  // Track elapsed duration for workout history
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(
    isNewDaySession ? 0 : initialWorkout?.durationSeconds || 0
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Editor left open across midnight: on return to the foreground, start a fresh day's session.
  const sessionDayKeyRef = useRef(toLocalDayKey(Date.now()));
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, [entries]);

  useEffect(() => {
    const checkNewDay = () => {
      if (document.visibilityState === "hidden") return;
      const now = new Date();
      if (shouldResetStaleSession(sessionDayKeyRef.current, lastActivityRef.current, now)) {
        sessionDayKeyRef.current = toLocalDayKey(now.getTime());
        setEntries(prev => resetCompletedSets(prev));
        setElapsedSeconds(0);
      }
    };
    document.addEventListener("visibilitychange", checkNewDay);
    window.addEventListener("focus", checkNewDay);
    return () => {
      document.removeEventListener("visibilitychange", checkNewDay);
      window.removeEventListener("focus", checkNewDay);
    };
  }, []);

  // Historical PR Lookup: calculate user's historical 1RM per exercise
  const historicalBest1RM = useMemo(() => {
    const map = new Map<string, number>();
    
    // We scan all workouts except the current one being edited
    const workoutsToScan = allWorkouts.filter(w => w.id !== historyExcludeId);

    workoutsToScan.forEach(w => {
      // Also scan snapshots in history if present
      const snapshots = [...(w.history || []), { date: w.date, entries: w.entries }];
      snapshots.forEach(snap => {
        snap.entries.forEach(entry => {
          const key = (entry.exerciseId || entry.name).toLowerCase().trim();
          let currentMax = map.get(key) || 0;
          
          entry.sets.forEach(s => {
            const wKg = s.weight || 0;
            const r = s.reps || 0;
            if (wKg > 0 && r > 0) {
              const est1RM = r > 1 ? wKg * (1 + r / 30) : wKg;
              if (est1RM > currentMax) {
                currentMax = est1RM;
              }
            }
          });
          map.set(key, currentMax);
        });
      });
    });

    return map;
  }, [allWorkouts, historyExcludeId]);

  // Progressive overload targets come only from earlier sessions of this same workout type,
  // recomputed when the exercise list, the history or the title (which defines the type) changes
  const exerciseSignature = entries.map(e => `${e.id}:${e.exerciseId}:${e.name}`).join("|");
  const workoutKey = initialWorkout?.id ?? "";
  const overloadByEntry = useMemo(() => {
    const map = new Map<string, OverloadSuggestion | null>();
    entries.forEach(entry => {
      map.set(
        entry.id,
        getOverloadSuggestion(entry.name, allWorkouts, {
          exerciseId: entry.exerciseId,
          excludeWorkoutId: historyExcludeId,
          workoutType: { workoutKey, title },
        })
      );
    });
    return map;
  }, [exerciseSignature, allWorkouts, historyExcludeId, workoutKey, title]);

  // Check if a specific completed set is a new PR
  const checkIsPR = (entry: ExerciseEntry, targetSet: Set): boolean => {
    if (!targetSet.completed || targetSet.weight <= 0 || targetSet.reps <= 0) {
      return false;
    }
    const key = (entry.exerciseId || entry.name).toLowerCase().trim();
    const prevBest = historicalBest1RM.get(key) || 0;
    const this1RM = targetSet.reps > 1 ? targetSet.weight * (1 + targetSet.reps / 30) : targetSet.weight;

    // Must beat previous historical best (if any)
    if (prevBest > 0 && this1RM <= prevBest) {
      return false;
    }

    // Must be the highest 1RM set in current workout for this exercise
    const highestInCurrent = Math.max(
      ...entry.sets
        .filter(s => s.completed && s.weight > 0 && s.reps > 0)
        .map(s => (s.reps > 1 ? s.weight * (1 + s.reps / 30) : s.weight))
    );

    return Math.abs(this1RM - highestInCurrent) < 0.1 && (prevBest > 0 || this1RM >= 20);
  };

  const addExercise = (ex: Exercise) => {
    const customMatch = ex.isCustom ? customExercises.find(c => c.id === ex.id) : undefined;
    const newEntry: ExerciseEntry = {
      id: Math.random().toString(36).substring(2, 9),
      exerciseId: ex.id,
      name: ex.name,
      sets: [{ id: "1", weight: customMatch?.muscleGroup === "Cardio" ? 0 : 20, reps: 10, completed: false, rpe: 8 }],
      ...(customMatch ? { muscleGroup: customMatch.muscleGroup } : {})
    };
    setEntries(prev => [...prev, newEntry]);
    setShowSearch(false);
  };

  const updateSet = (entryId: string, setId: string, updates: Partial<Set>) => {
    if (updates.completed === true) {
      const wasCompleted = entries
        .find(e => e.id === entryId)
        ?.sets.find(s => s.id === setId)?.completed;
      if (!wasCompleted) {
        startRestTimer(DEFAULT_REST_SECONDS, { minimized: false });
        onSetCompleted?.();
      }
    }

    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e;
      return {
        ...e,
        sets: e.sets.map(s => (s.id === setId ? { ...s, ...updates } : s))
      };
    }));
  };

  const adjustWeight = (entryId: string, setId: string, delta: number) => {
    setEntries(prev => prev.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          sets: e.sets.map(s => {
            if (s.id === setId) {
              const nextWeight = Math.max(0, Math.round((s.weight + delta) * 10) / 10);
              return { ...s, weight: nextWeight };
            }
            return s;
          })
        };
      }
      return e;
    }));
  };

  const adjustReps = (entryId: string, setId: string, delta: number) => {
    setEntries(prev => prev.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          sets: e.sets.map(s => {
            if (s.id === setId) {
              const nextReps = Math.max(0, Math.round(s.reps + delta));
              return { ...s, reps: nextReps };
            }
            return s;
          })
        };
      }
      return e;
    }));
  };

  const addSet = (entryId: string) => {
    setEntries(prev => prev.map(e => {
      if (e.id === entryId) {
        const lastSet = e.sets[e.sets.length - 1] || { weight: 20, reps: 10, rpe: 8 };
        return {
          ...e,
          sets: [...e.sets, { 
            id: Math.random().toString(36).substring(2, 9), 
            weight: lastSet.weight, 
            reps: lastSet.reps, 
            completed: false,
            rpe: lastSet.rpe || 8
          }]
        };
      }
      return e;
    }));
  };

  const removeSet = (entryId: string, setId: string) => {
    setEntries(prev => prev.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          sets: e.sets.filter(s => s.id !== setId)
        };
      }
      return e;
    }));
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const moveExercise = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= entries.length) return;
    setEntries(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const handleSave = () => {
    if (entries.length === 0) return;
    
    // Tag sets with isPR for permanent history tracking
    const finalizedEntries = entries.map(entry => ({
      ...entry,
      sets: entry.sets.map(s => ({
        ...s,
        isPR: checkIsPR(entry, s)
      }))
    }));

    onSave({
      id: initialWorkout?.id || Math.random().toString(36).substring(2, 9),
      date: initialWorkout?.date || new Date().toISOString(),
      title,
      entries: finalizedEntries,
      durationSeconds: elapsedSeconds
    });
  };

  return (
    <div className="fixed inset-0 bg-[#f4f7f0] dark:bg-[#0A0A0A] z-[100] flex flex-col animate-in slide-in-from-right-full duration-500 shadow-2xl">
      {/* Top Header */}
      <header className="px-4 py-3.5 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-md gap-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button 
            onClick={onCancel} 
            className="text-slate-400 dark:text-zinc-500 hover:text-blue-600 transition-colors p-2.5 bg-slate-50 dark:bg-white/5 rounded-xl shrink-0 cursor-pointer"
            title="Înapoi"
          >
            <ChevronLeft className="size-5" />
          </button>
          
          <div className="min-w-0 flex-1">
            {isEditingTitle ? (
              <input 
                autoFocus
                value={title}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={e => e.key === 'Enter' && setIsEditingTitle(false)}
                onChange={e => setTitle(e.target.value)}
                className="bg-transparent font-black text-lg focus:outline-none w-full text-black dark:text-zinc-50 tracking-tight"
              />
            ) : (
              <h2 
                onClick={() => setIsEditingTitle(true)}
                className="font-black text-lg truncate cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-1.5 text-black dark:text-zinc-50 tracking-tight"
              >
                {title} <Edit2 className="size-3.5 opacity-40 shrink-0" />
              </h2>
            )}
          </div>
        </div>
      </header>

      {/* Main Exercise & Set List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-28 no-scrollbar">
        {entries.map((entry, index) => {
          const hasAnyPR = entry.sets.some(s => checkIsPR(entry, s));
          const overload = overloadByEntry.get(entry.id) ?? null;

          return (
            <div 
              key={entry.id} 
              className={cn(
                "bg-white dark:bg-[#1a1a1a] border rounded-[2.5rem] overflow-hidden shadow-xs transition-all",
                hasAnyPR 
                  ? "border-amber-500/40 dark:border-amber-500/30 ring-1 ring-amber-500/20" 
                  : "border-slate-200 dark:border-white/5"
              )}
            >
              {/* Exercise Card Header */}
              <div className="bg-slate-50 dark:bg-white/5 p-4 sm:p-5 flex justify-between items-center border-b border-slate-200 dark:border-white/5 gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-0.5 shrink-0 bg-slate-200/60 dark:bg-black/40 p-0.5 rounded-xl border border-slate-200/50 dark:border-white/5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveExercise(index, "up");
                      }}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        index === 0
                          ? "opacity-25 cursor-not-allowed text-slate-400 dark:text-zinc-600"
                          : "text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-white/10 active:scale-90 cursor-pointer"
                      )}
                      title="Mută mai sus"
                      aria-label="Mută exercițiul mai sus"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === entries.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveExercise(index, "down");
                      }}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        index === entries.length - 1
                          ? "opacity-25 cursor-not-allowed text-slate-400 dark:text-zinc-600"
                          : "text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-white/10 active:scale-90 cursor-pointer"
                      )}
                      title="Mută mai jos"
                      aria-label="Mută exercițiul mai jos"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-slate-950 dark:text-orange-500 text-xs uppercase tracking-[0.2em] leading-snug break-words">
                      {entry.name}
                    </h4>
                    <p
                      className="mt-1 flex items-start gap-1 text-xs font-semibold text-slate-500 dark:text-zinc-400"
                      title={overload?.label}
                    >
                      <Zap className="size-3 mt-0.5 text-orange-500 shrink-0" />
                      <span className="min-w-0 break-words">
                        {overload ? describeOverloadTarget(overload) : "Stabilește greutatea de referință"}
                      </span>
                    </p>
                    {hasAnyPR && (
                      <span className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider animate-pulse">
                        <Trophy className="size-3" />
                        Record Nou!
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => removeEntry(entry.id)} 
                  className="text-slate-300 dark:text-zinc-600 hover:text-red-500 transition-colors cursor-pointer p-1.5 shrink-0"
                  title="Șterge exercițiul"
                >
                  <Trash2 className="size-4 pointer-events-none" />
                </button>
              </div>
              
              {/* Sets Table */}
              <div className="p-3 sm:p-5 space-y-2">
                {/* Column Headers (Minimalist 5-column grid matching SetRow) */}
                <div className="grid grid-cols-[1.1fr_2.5fr_2.5fr_1.8fr_1.3fr] items-center gap-1.5 sm:gap-2 px-2 text-[10px] text-slate-400 dark:text-zinc-500 font-black uppercase tracking-wider text-center select-none pb-1">
                  <span>Set</span>
                  <span>KG</span>
                  <span>Reps</span>
                  <span>RPE</span>
                  <span>✓</span>
                </div>

                {/* Set Rows */}
                <div className="space-y-1.5">
                  {entry.sets.map((s, idx) => {
                    const isPR = checkIsPR(entry, s);
                    const est1RM = s.reps > 1 ? Math.round(s.weight * (1 + s.reps / 30)) : s.weight;

                    return (
                      <SetRow
                        key={s.id}
                        setIndex={idx}
                        set={s}
                        isPR={isPR}
                        est1RM={est1RM}
                        onUpdate={(updates) => updateSet(entry.id, s.id, updates)}
                        onToggleComplete={() => updateSet(entry.id, s.id, { completed: !s.completed })}
                        onDeleteSet={() => removeSet(entry.id, s.id)}
                      />
                    );
                  })}
                </div>

                <button 
                  type="button"
                  onClick={() => addSet(entry.id)}
                  className="w-full py-2.5 border border-dashed border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.25em] bg-white/50 dark:bg-transparent hover:bg-slate-50 transition-all active:scale-98 cursor-pointer mt-2"
                >
                  + Adaugă Set
                </button>
              </div>
            </div>
          );
        })}

        {/* Add Exercise Big Button */}
        <button 
          type="button"
          onClick={() => setShowSearch(true)}
          className="w-full py-10 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] bg-white dark:bg-transparent text-slate-400 dark:text-zinc-600 font-black flex flex-col items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all group backdrop-blur-xs cursor-pointer"
        >
          <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-full group-hover:scale-110 transition-transform border border-slate-100 dark:border-transparent">
            <Plus className="size-8 text-black dark:text-white pointer-events-none" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.4em] pointer-events-none">Adaugă Exercițiu</span>
        </button>
      </div>

      {/* STICKY FOOTER: Fixed at bottom with identical heights and alignment */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-zinc-950/95 border-t border-slate-200 dark:border-white/5 backdrop-blur-xl flex items-center justify-between gap-3 z-50">
        <button
          type="button"
          onClick={onCancel}
          className="w-1/3 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-800/90 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-red-500 font-black text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-white/5"
        >
          Anulează
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={entries.length === 0}
          className="w-2/3 h-14 px-2 sm:px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white dark:text-black font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-xl shadow-blue-600/20 active:scale-98 transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="text-center leading-tight whitespace-nowrap">
            {initialWorkout ? (
              <>
                <span className="hidden sm:inline">Actualizează Antrenament</span>
                <span className="sm:hidden">Actualizează</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Finalizează Antrenament</span>
                <span className="sm:hidden">Finalizează</span>
              </>
            )}
          </span>
        </button>
      </footer>

      <RestTimer placement="editor" />

      {/* Exercise Search Bottom Sheet / Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 35, stiffness: 350 }}
            className="fixed inset-0 bg-[#f4f7f0] dark:bg-[#0A0A0A] z-[110] p-6 flex flex-col shadow-[0_-20px_100px_rgba(0,0,0,0.4)] overscroll-contain"
          >
            <div className="flex items-center gap-6 mb-6 py-2 px-2">
              <button 
                type="button"
                onClick={() => setShowSearch(false)} 
                className="bg-white dark:bg-zinc-800 p-3.5 rounded-[1.2rem] text-black dark:text-white active:scale-95 transition-transform border border-slate-200 dark:border-transparent shadow-xs cursor-pointer"
              >
                <ChevronLeft className="size-6 pointer-events-none" />
              </button>
              <div>
                <h2 className="text-3xl font-black text-black dark:text-zinc-50 tracking-tighter uppercase leading-none">Baza de Exerciții</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Selectează pentru antrenament</p>
              </div>
            </div>

            <div className="relative mb-4 px-2">
              <Search className="absolute left-7 top-1/2 -translate-y-1/2 size-5 text-slate-400 dark:text-zinc-400" />
              <input 
                type="text"
                name="search-exercise-unique"
                id="search-exercise-unique"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="search"
                data-form-type="other"
                placeholder="Caută după nume sau grupă musculară..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-[1.5rem] py-4 pl-14 pr-6 text-sm focus:outline-none focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-orange-500/20 text-black dark:text-white font-bold transition-all shadow-xs placeholder:text-slate-300"
              />
            </div>

            <div className="px-2 mb-4">
              <button
                type="button"
                onClick={openCustomForm}
                className="w-full h-14 rounded-[1.5rem] border-2 border-dashed border-blue-600/40 dark:border-orange-500/50 bg-blue-600/5 dark:bg-orange-500/10 text-blue-600 dark:text-orange-500 font-black text-xs uppercase tracking-[0.2em] active:scale-98 hover:bg-blue-600/10 dark:hover:bg-orange-500/15 transition-all cursor-pointer"
              >
                + Adaugă Exercițiu Custom
              </button>
            </div>

            <div 
              ref={listContainerRef}
              className="space-y-3 overflow-y-auto pb-12 no-scrollbar px-2 flex-1 overscroll-contain"
            >
              {visibleExercises.map(ex => (
                <div
                  key={ex.id}
                  className="w-full flex items-stretch bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-xs hover:shadow-sm transition-all"
                >
                  <button
                    type="button"
                    onClick={() => addExercise(ex)}
                    className="group flex-1 min-w-0 flex items-center justify-between gap-3 p-6 text-left hover:bg-slate-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="text-left pointer-events-none min-w-0">
                      <p className="font-black text-black dark:text-white text-base tracking-tight leading-snug break-words">{ex.name}</p>
                      <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 leading-none flex items-center gap-2">
                        <span>{ex.category}</span>
                        {ex.isCustom && (
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-600/10 dark:bg-orange-500/15 tracking-widest text-[9px]">Custom</span>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-slate-300 dark:text-zinc-700 group-hover:text-blue-600 dark:group-hover:text-orange-500 group-hover:translate-x-1 transition-all pointer-events-none" />
                  </button>
                  {ex.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomExercise(ex)}
                      className="px-4 border-l border-slate-100 dark:border-white/5 text-slate-300 dark:text-zinc-600 hover:text-red-500 transition-colors cursor-pointer"
                      title="Șterge exercițiul custom"
                      aria-label={`Șterge exercițiul custom ${ex.name}`}
                    >
                      <Trash2 className="size-4 pointer-events-none" />
                    </button>
                  )}
                </div>
              ))}

              {visibleExercises.length === 0 && (
                <div className="py-12 text-center space-y-1">
                  <p className="text-sm font-black text-slate-500 dark:text-zinc-400">
                    Niciun exercițiu găsit pentru „{searchQuery.trim()}”.
                  </p>
                  <p className="text-xs font-semibold text-slate-400 dark:text-zinc-600">
                    Creează-l cu butonul „+ Adaugă Exercițiu Custom”.
                  </p>
                </div>
              )}
            </div>

            {/* Custom exercise form */}
            <AnimatePresence>
              {showCustomForm && (
                <motion.div
                  key="custom-exercise-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
                  onClick={closeCustomForm}
                >
                  <motion.form
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    transition={{ type: "spring", damping: 30, stiffness: 380 }}
                    onSubmit={handleCreateCustomExercise}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[2rem] p-6 space-y-5 shadow-2xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight leading-none">
                          Exercițiu Custom
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-orange-500 mt-1.5">
                          Se salvează pe acest dispozitiv
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeCustomForm}
                        className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                        aria-label="Închide formularul"
                      >
                        <X className="size-4 pointer-events-none" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="custom-exercise-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                        Nume Exercițiu
                      </label>
                      <input
                        id="custom-exercise-name"
                        type="text"
                        autoFocus
                        autoComplete="off"
                        maxLength={MAX_EXERCISE_NAME_LENGTH}
                        placeholder="ex: Împins la mașina Hammer"
                        value={customName}
                        onChange={(e) => {
                          setCustomName(e.target.value);
                          if (customError) setCustomError(null);
                        }}
                        aria-invalid={customError !== null}
                        className="w-full h-14 px-4 rounded-2xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 dark:focus:border-orange-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-orange-500/20 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="custom-exercise-group" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                        Grupă Musculară
                      </label>
                      <div className="relative">
                        <select
                          id="custom-exercise-group"
                          value={customGroup}
                          onChange={(e) => setCustomGroup(e.target.value as CustomMuscleGroup)}
                          className="w-full h-14 pl-4 pr-12 appearance-none rounded-2xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-orange-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-orange-500/20 transition-all cursor-pointer"
                        >
                          {CUSTOM_MUSCLE_GROUPS.map(group => (
                            <option key={group} value={group}>{group}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                      </div>
                    </div>

                    {customError && (
                      <p role="alert" className="text-xs font-bold text-red-500">
                        {customError}
                      </p>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={closeCustomForm}
                        className="flex-1 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                      >
                        Anulează
                      </button>
                      <button
                        type="submit"
                        disabled={!customName.trim()}
                        className="flex-1 h-14 rounded-2xl bg-blue-600 dark:bg-orange-500 hover:bg-blue-700 dark:hover:bg-orange-600 text-white dark:text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 dark:shadow-orange-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                      >
                        Salvează
                      </button>
                    </div>
                  </motion.form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
