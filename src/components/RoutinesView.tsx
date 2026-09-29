import React, { useState, useEffect } from "react";
import { Plus, Play, Lock, Sparkles, Dumbbell, Trash2, ChevronRight, X } from "lucide-react";
import { RoutineTemplate, Workout, ExerciseEntry, PRESET_EXERCISES } from "../types";
import { PurchaseService } from "../services/purchaseService";

interface RoutinesViewProps {
  onStartWorkoutFromRoutine: (routine: RoutineTemplate) => void;
  onUpgradeClick: () => void;
}

const DEFAULT_ROUTINES: RoutineTemplate[] = [
  {
    id: "routine-push",
    name: "Push Day (Piept, Umeri, Triceps)",
    description: "Focus pe forță la împins compus urmat de izolare mecanică.",
    split: "PPL",
    exerciseIds: ["barbell-bench-press", "incline-dumbbell-press", "cable-crossovers-mid-chest"],
    exercises: [
      { exerciseId: "barbell-bench-press", name: "Barbell Bench Press", defaultSets: 3, targetReps: 8 },
      { exerciseId: "incline-dumbbell-press", name: "Incline Dumbbell Press", defaultSets: 3, targetReps: 10 },
      { exerciseId: "cable-crossovers-mid-chest", name: "Cable Crossovers (Mid-Chest)", defaultSets: 3, targetReps: 12 },
    ],
  },
  {
    id: "routine-pull",
    name: "Pull Day (Spate, Deltoid Post, Biceps)",
    description: "Tracțiuni compuse, ramat greu și izolare pentru brațe.",
    split: "PPL",
    exerciseIds: ["conventional-deadlift"],
    exercises: [
      { exerciseId: "conventional-deadlift", name: "Conventional Deadlift", defaultSets: 3, targetReps: 6 },
    ],
  },
  {
    id: "routine-legs",
    name: "Legs (Cvadricepși, Femurali & Gambe)",
    description: "Tensiune mecanică intensă pentru membrele inferioare.",
    split: "PPL",
    exerciseIds: [],
    exercises: [
      { exerciseId: "squat", name: "Barbell Back Squat", defaultSets: 4, targetReps: 8 },
      { exerciseId: "romanian-deadlift", name: "Romanian Deadlift (RDL)", defaultSets: 3, targetReps: 10 },
      { exerciseId: "leg-press", name: "Leg Press 45°", defaultSets: 3, targetReps: 12 },
    ],
  },
  {
    id: "routine-upper",
    name: "Upper Body Hypertrophy",
    description: "Sesiune completă pentru trunchi superior în split Upper/Lower.",
    split: "Upper/Lower",
    exerciseIds: [],
    exercises: [
      { exerciseId: "incline-barbell-bench-press", name: "Incline Barbell Bench Press", defaultSets: 3, targetReps: 8 },
      { exerciseId: "pull-ups", name: "Pull-Ups (Ponderate)", defaultSets: 3, targetReps: 8 },
      { exerciseId: "dumbbell-shoulder-press", name: "Dumbbell Shoulder Press", defaultSets: 3, targetReps: 10 },
    ],
  },
];

export const RoutinesView: React.FC<RoutinesViewProps> = ({
  onStartWorkoutFromRoutine,
  onUpgradeClick,
}) => {
  const [routines, setRoutines] = useState<RoutineTemplate[]>(() => {
    const saved = localStorage.getItem("fittrack_routines_v1");
    return saved ? JSON.parse(saved) : DEFAULT_ROUTINES;
  });

  const [isPro, setIsPro] = useState(PurchaseService.isPro());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSplit, setNewSplit] = useState<RoutineTemplate["split"]>("PPL");
  const [selectedExercises, setSelectedExercises] = useState<{ exerciseId: string; name: string; defaultSets: number; targetReps: number }[]>([]);

  useEffect(() => {
    return PurchaseService.subscribe((lic) => setIsPro(lic.isProUser));
  }, []);

  useEffect(() => {
    const handleRoutinesUpdated = () => {
      const saved = localStorage.getItem("fittrack_routines_v1");
      if (saved) {
        try {
          setRoutines(JSON.parse(saved));
        } catch {}
      }
    };
    window.addEventListener("routines_updated", handleRoutinesUpdated);
    return () => window.removeEventListener("routines_updated", handleRoutinesUpdated);
  }, []);

  useEffect(() => {
    localStorage.setItem("fittrack_routines_v1", JSON.stringify(routines));
  }, [routines]);

  const handleCreateRoutine = () => {
    if (!newTitle.trim() || selectedExercises.length === 0) return;

    const newRoutine: RoutineTemplate = {
      id: "routine-" + Math.random().toString(36).substring(2, 9),
      name: newTitle.trim(),
      description: newDesc.trim() || "Rutină personalizată",
      split: newSplit,
      exerciseIds: selectedExercises.map((e) => e.exerciseId),
      exercises: selectedExercises,
    };

    setRoutines([newRoutine, ...routines]);
    setShowCreateModal(false);
    setNewTitle("");
    setNewDesc("");
    setSelectedExercises([]);
  };

  const deleteRoutine = (id: string) => {
    setRoutines(routines.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-6 sticky top-0 bg-[#f4f7f0] dark:bg-[#0A0A0A] z-20 border-b border-slate-200 dark:border-white/5 -mx-4 transition-all flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-zinc-50 uppercase leading-none">
            Rutine.
          </h1>
          <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1.5 leading-none">
            Template-uri & Split-uri • Nelimitat
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 dark:bg-orange-500 hover:bg-blue-700 dark:hover:bg-orange-600 text-white dark:text-black p-3.5 rounded-2xl shadow-lg shadow-blue-600/20 cursor-pointer active:scale-95 transition-transform duration-150"
        >
          <Plus className="size-5" />
        </button>
      </header>

      {/* Routine Cards List */}
      <div className="space-y-4">
        {routines.map((r) => {
          return (
            <div
              key={r.id}
              className="p-6 sm:p-7 rounded-[2.5rem] border transition-all relative overflow-hidden bg-white dark:bg-[#1a1a1a] border-slate-200/70 dark:border-white/5 shadow-sm hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-orange-500 bg-blue-50 dark:bg-orange-500/10 px-2.5 py-1 rounded-md">
                    {r.split}
                  </span>
                  <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight mt-2 leading-tight">
                    {r.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1">
                    {r.description}
                  </p>
                </div>

                <button
                  onClick={() => deleteRoutine(r.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                  title="Șterge rutina"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {/* Exercises in routine */}
              <div className="space-y-2 my-4 pt-2 border-t border-slate-100 dark:border-white/5">
                {r.exercises.map((ex, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-xs py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-white/[0.02]"
                  >
                    <span className="font-bold text-slate-800 dark:text-zinc-200 truncate pr-2">
                      {ex.name}
                    </span>
                    <span className="text-[10px] font-black text-slate-500 dark:text-zinc-500 shrink-0">
                      {ex.defaultSets} serii × {ex.targetReps} reps
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <button
                onClick={() => onStartWorkoutFromRoutine(r)}
                className="w-full py-3.5 rounded-2xl bg-blue-600 dark:bg-orange-500 hover:bg-blue-700 dark:hover:bg-orange-600 text-white dark:text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-98 cursor-pointer transition-all"
              >
                <Play className="size-4 fill-current" />
                <span>Începe Antrenamentul</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Create Routine Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tight">
                Rutină Nouă
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Nume Rutină
                </label>
                <input
                  type="text"
                  placeholder="Ex: Push Hypertrophy A"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full mt-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Split
                </label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {(["PPL", "Upper/Lower", "Full Body", "Arnold", "Custom"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewSplit(s)}
                      className={`p-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                        newSplit === s
                          ? "bg-blue-600 text-white dark:bg-orange-500 dark:text-black"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add exercises selector */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                  Alege Exerciții din Bază ({selectedExercises.length})
                </label>

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-black/30 rounded-2xl border border-slate-200 dark:border-white/10">
                  {PRESET_EXERCISES.slice(0, 25).map((ex) => {
                    const isSelected = selectedExercises.some((e) => e.exerciseId === ex.id);
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedExercises(selectedExercises.filter((e) => e.exerciseId !== ex.id));
                          } else {
                            setSelectedExercises([
                              ...selectedExercises,
                              { exerciseId: ex.id, name: ex.name, defaultSets: 3, targetReps: 10 },
                            ]);
                          }
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs font-bold flex justify-between items-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white dark:bg-orange-500 dark:text-black"
                            : "hover:bg-slate-200/60 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200"
                        }`}
                      >
                        <span className="truncate">{ex.name}</span>
                        <span className="text-[10px] uppercase font-black ml-2 opacity-80">
                          {isSelected ? "Adăugat ✓" : "+ Adaugă"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleCreateRoutine}
                disabled={!newTitle.trim() || selectedExercises.length === 0}
                className="w-full py-4 rounded-2xl bg-blue-600 dark:bg-orange-500 text-white dark:text-black font-black text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50"
              >
                Salvează Rutină
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
