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
import { Workout, ExerciseEntry, Exercise, Set, PRESET_EXERCISES } from "../types";
import { cn } from "../lib/utils";
import { SetRow } from "./SetRow";

export interface WorkoutEditorProps {
  key?: React.Key;
  onSave: (w: Workout) => void;
  onCancel: () => void;
  initialWorkout?: Workout;
  allWorkouts?: Workout[];
  onSetCompleted?: () => void;
}

export const WorkoutEditor = ({ 
  onSave, 
  onCancel, 
  initialWorkout, 
  allWorkouts = [],
  onSetCompleted 
}: WorkoutEditorProps) => {
  const [title, setTitle] = useState(initialWorkout?.title || "Antrenament Forță");
  const [entries, setEntries] = useState<ExerciseEntry[]>(() =>
    initialWorkout?.entries ? JSON.parse(JSON.stringify(initialWorkout.entries)) : []
  );
  const [showSearch, setShowSearch] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSearch) {
      if (listContainerRef.current) {
        listContainerRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    }
  }, [showSearch]);

  useEffect(() => {
    if (initialWorkout?.entries) {
      setEntries(JSON.parse(JSON.stringify(initialWorkout.entries)));
    }
    if (initialWorkout?.title) {
      setTitle(initialWorkout.title);
    }
  }, [initialWorkout]);

  // Track elapsed duration for workout history
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(initialWorkout?.durationSeconds || 0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Historical PR Lookup: calculate user's historical 1RM per exercise
  const historicalBest1RM = useMemo(() => {
    const map = new Map<string, number>();
    
    // We scan all workouts except the current one being edited
    const workoutsToScan = allWorkouts.filter(w => w.id !== initialWorkout?.id);

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
  }, [allWorkouts, initialWorkout]);

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
    const newEntry: ExerciseEntry = {
      id: Math.random().toString(36).substring(2, 9),
      exerciseId: ex.id,
      name: ex.name,
      sets: [{ id: "1", weight: 20, reps: 10, completed: false, rpe: 8 }]
    };
    setEntries(prev => [...prev, newEntry]);
    setShowSearch(false);
  };

  const updateSet = (entryId: string, setId: string, updates: Partial<Set>) => {
    setEntries(prev => prev.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          sets: e.sets.map(s => {
            if (s.id === setId) {
              const updated = { ...s, ...updates };
              // Trigger rest timer if set marked as completed
              if (updates.completed === true && !s.completed && onSetCompleted) {
                onSetCompleted();
              }
              return updated;
            }
            return s;
          })
        };
      }
      return e;
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

                  <h4 className="font-black text-slate-950 dark:text-orange-500 text-xs uppercase tracking-[0.2em] truncate">
                    {entry.name}
                  </h4>
                  {hasAnyPR && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider shrink-0 animate-pulse">
                      <Trophy className="size-3" />
                      Record Nou!
                    </span>
                  )}
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

            <div className="relative mb-6 px-2">
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
                className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-[1.5rem] py-4 pl-14 pr-6 text-sm focus:outline-none focus:ring-4 focus:ring-blue-600/10 text-black dark:text-white font-bold transition-all shadow-xs placeholder:text-slate-300"
                onChange={(e) => {
                  const term = e.target.value.toLowerCase();
                  const elements = document.querySelectorAll(".search-exercise-item");
                  elements.forEach((el) => {
                    const name = el.getAttribute("data-name")?.toLowerCase() || "";
                    const category = el.getAttribute("data-category")?.toLowerCase() || "";
                    const isCategoryMatch = category.includes(term) && term.length >= 3;
                    
                    if (name.includes(term) || isCategoryMatch) {
                      (el as HTMLElement).style.display = "flex";
                    } else {
                      (el as HTMLElement).style.display = "none";
                    }
                  });
                }}
              />
            </div>

            <div 
              ref={listContainerRef}
              className="space-y-3 overflow-y-auto pb-12 no-scrollbar px-2 flex-1 overscroll-contain"
            >
              {PRESET_EXERCISES.map(ex => (
                <button
                  type="button"
                  key={ex.id}
                  onClick={() => addExercise(ex)}
                  className="search-exercise-item w-full flex items-center justify-between p-6 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/5 rounded-[2rem] hover:bg-slate-50 dark:hover:bg-white/10 transition-all group shadow-xs hover:shadow-sm cursor-pointer"
                  data-name={ex.name}
                  data-category={ex.category}
                >
                  <div className="text-left pointer-events-none">
                    <p className="font-black text-black dark:text-white text-base tracking-tight leading-none">{ex.name}</p>
                    <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 leading-none">{ex.category}</p>
                  </div>
                  <ChevronRight className="size-5 text-slate-300 dark:text-zinc-700 group-hover:text-blue-600 group-hover:translate-x-1 transition-all pointer-events-none" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
