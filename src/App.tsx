import React, { useState, useEffect } from "react";
import { 
  Dumbbell, 
  TrendingUp, 
  Plus, 
  Calendar, 
  Trash2, 
  Settings, 
  Sparkles, 
  X, 
  Activity, 
  Utensils, 
  Timer as TimerIcon, 
  Cloud, 
  ChevronRight, 
  Share2 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Workout, 
  ProgressEntry, 
  RoutineTemplate, 
  LicenseInfo 
} from "./types";
import { cn, formatDate } from "./lib/utils";
import { PurchaseService } from "./services/purchaseService";
import { UpgradeModal } from "./components/UpgradeModal";
import { RestTimer } from "./components/RestTimer";
import { NutritionView } from "./components/NutritionView";
import { AiCoachView } from "./components/AiCoachView";
import { RoutinesView } from "./components/RoutinesView";
import { ExportModal } from "./components/ExportModal";
import { HomeView } from "./components/HomeView";
import { WorkoutEditor } from "./components/WorkoutEditor";
import { EvolutionView } from "./components/EvolutionView";

// --- Components ---

const Navbar = ({ 
  activeTab, 
  setActiveTab 
}: { 
  activeTab: string; 
  setActiveTab: (t: string) => void; 
}) => {
  const tabs = [
    { id: "home", icon: TrendingUp, label: "Acasă" },
    { id: "workouts", icon: Dumbbell, label: "Jurnal" },
    { id: "nutrition", icon: Utensils, label: "Nutriție" },
    { id: "coach", icon: Sparkles, label: "AI Coach" },
    { id: "evolution", icon: Activity, label: "Evoluție" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 z-40 bg-white/95 dark:bg-[#000000] border-t border-slate-200 dark:border-white/10 select-none touch-manipulation">
      <div className="flex justify-around items-center max-w-lg mx-auto px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center w-full py-1 transition-all duration-150 relative group cursor-pointer active:scale-95",
              activeTab === tab.id 
                ? "text-blue-600 dark:text-orange-500 scale-105" 
                : "text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-200"
            )}
          >
            <div className="relative">
              <tab.icon className={cn(
                "size-5 sm:size-6 mb-1 transition-transform duration-150", 
                activeTab === tab.id ? "text-blue-600 dark:text-orange-500" : "text-slate-400 dark:text-zinc-500"
              )} />
            </div>
            <span className={cn(
              "text-[9px] uppercase font-black tracking-wider transition-opacity",
              activeTab === tab.id ? "opacity-100 text-blue-600 dark:text-orange-500" : "opacity-90 text-slate-400 dark:text-zinc-500"
            )}>{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="nav-indicator"
                className="absolute -top-1 left-1/4 right-1/4 h-0.5 bg-blue-600 dark:bg-orange-500 rounded-full"
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

// --- Views ---

const WorkoutsView = ({ 
  workouts, 
  onAddWorkout, 
  onDeleteWorkout, 
  onSelectWorkout 
}: { 
  workouts: Workout[]; 
  onAddWorkout: () => void; 
  onDeleteWorkout: (id: string) => void; 
  onSelectWorkout: (w: Workout) => void; 
}) => {
  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-4 px-6 sticky top-0 bg-[#f4f7f0] dark:bg-[#000000] z-20 border-b border-slate-200 dark:border-white/5 -mx-4 transition-all flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-zinc-50 uppercase leading-none">Jurnal.</h1>
          <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1.5 leading-none">Istoric Antrenamente</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddWorkout}
            className="bg-blue-600 dark:bg-orange-500 text-white dark:text-black p-2.5 rounded-xl cursor-pointer active:scale-95 transition-transform duration-150"
            title="Adaugă Antrenament"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </header>

      <div className="space-y-5 px-1">
        {workouts.map(w => (
          <div 
            key={w.id} 
            onClick={() => onSelectWorkout(w)}
            className="p-8 bg-white dark:bg-[#141414] border border-slate-200/60 dark:border-white/5 rounded-[2.5rem] cursor-pointer hover:border-blue-500/20 dark:hover:border-orange-500/30 transition-all relative group"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-black text-2xl text-slate-950 dark:text-white leading-tight tracking-tighter uppercase pr-2">{w.title}</h4>
                <p className="text-slate-500 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-2 leading-none">
                  <Calendar className="size-3 text-blue-600 dark:text-orange-500" /> {formatDate(w.date)}
                </p>
              </div>
              
              <div 
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDeleteWorkout(w.id);
                }}
                className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all cursor-pointer active:scale-95 shrink-0 relative z-10 flex items-center justify-center"
                aria-label="Șterge antrenament"
              >
                <Trash2 className="size-4 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-4 mt-6">
              {w.entries.slice(0, 4).map((e, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-blue-600 dark:bg-orange-500 shrink-0" />
                    <p className="text-slate-950 dark:text-zinc-300 text-sm font-black tracking-tight leading-none">
                      {e.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-3.5">
                    {e.sets.map((s, i) => (
                      <span key={i} className="text-[10px] bg-slate-50 dark:bg-zinc-800/80 px-2 py-1.5 rounded-md text-slate-700 dark:text-zinc-400 font-bold border border-slate-200 dark:border-white/5">
                        {s.weight}kg × {s.reps} {s.rpe ? `@RPE ${s.rpe}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {w.entries.length > 4 && (
                <p className="text-slate-400 dark:text-zinc-600 text-xs font-bold uppercase tracking-[0.1em] mt-2 italic px-4">
                  + încă {w.entries.length - 4} exerciții
                </p>
              )}
            </div>
          </div>
        ))}
        
        {workouts.length === 0 && (
          <div className="text-center py-24 flex flex-col items-center">
            <div className="bg-zinc-100 dark:bg-zinc-900 p-8 rounded-[3rem] mb-6">
              <Dumbbell className="size-16 text-zinc-300 dark:text-zinc-800" />
            </div>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm font-black uppercase tracking-widest italic">Niciun antrenament înregistrat.</p>
            <button 
              onClick={onAddWorkout}
              className="mt-8 bg-blue-600 dark:bg-orange-500 text-white dark:text-black font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-[0.2em] active:scale-95 transition-all cursor-pointer"
            >
              Începe Primul Antrenament
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [tempWeight, setTempWeight] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  
  // Licensing & Modals State
  const [license, setLicense] = useState<LicenseInfo>(PurchaseService.getLicense());
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);

  useEffect(() => {
    const savedWorkouts = localStorage.getItem("workouts");
    const savedProgress = localStorage.getItem("progress");
    const savedTheme = localStorage.getItem("app-theme") as "light" | "dark";
    
    if (savedWorkouts) setWorkouts(JSON.parse(savedWorkouts));
    if (savedProgress) setProgress(JSON.parse(savedProgress));
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme("dark");
    }

    const unsub = PurchaseService.subscribe((lic) => {
      setLicense(lic);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const saveToStorage = (ws: Workout[], ps: ProgressEntry[]) => {
    localStorage.setItem("workouts", JSON.stringify(ws));
    localStorage.setItem("progress", JSON.stringify(ps));
  };

  const handleSaveWorkout = (w: Workout) => {
    const existingIndex = workouts.findIndex(existing => existing.id === w.id);
    let newWorkouts = [...workouts];

    if (existingIndex >= 0) {
      const existingWorkout = newWorkouts[existingIndex];
      newWorkouts[existingIndex] = {
        ...existingWorkout,
        title: w.title,
        entries: JSON.parse(JSON.stringify(w.entries)),
        durationSeconds: w.durationSeconds !== undefined ? w.durationSeconds : existingWorkout.durationSeconds
      };
    } else {
      const newWorkout: Workout = {
        ...JSON.parse(JSON.stringify(w)),
        date: w.date || new Date().toISOString(),
        history: []
      };
      newWorkouts = [newWorkout, ...newWorkouts];
    }

    try {
      const savedRoutines = localStorage.getItem("fittrack_routines_v1");
      if (savedRoutines) {
        const routinesList: RoutineTemplate[] = JSON.parse(savedRoutines);
        let routinesUpdated = false;
        const updatedRoutines = routinesList.map(r => {
          if (r.name.trim().toLowerCase() === w.title.trim().toLowerCase()) {
            const updatedExercises = r.exercises.map(ex => {
              const matchingEntry = w.entries.find(e => 
                (e.exerciseId && e.exerciseId === ex.exerciseId) || 
                e.name.trim().toLowerCase() === ex.name.trim().toLowerCase()
              );
              if (matchingEntry && matchingEntry.sets.length > 0) {
                const latestRep = matchingEntry.sets[0].reps;
                if (latestRep && latestRep !== ex.targetReps) {
                  routinesUpdated = true;
                  return { ...ex, targetReps: latestRep };
                }
              }
              return ex;
            });
            return { ...r, exercises: updatedExercises };
          }
          return r;
        });

        if (routinesUpdated) {
          localStorage.setItem("fittrack_routines_v1", JSON.stringify(updatedRoutines));
          window.dispatchEvent(new Event("routines_updated"));
        }
      }
    } catch (err) {
      console.error("Error updating routine target reps:", err);
    }

    setWorkouts(newWorkouts);
    setIsEditing(false);
    setSelectedWorkout(null);
    setActiveTab("workouts");
    saveToStorage(newWorkouts, progress);
  };

  const addWeightEntry = (val: number) => {
    const newEntry: ProgressEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      weight: val
    };
    const newProgress = [...progress, newEntry];
    setProgress(newProgress);
    saveToStorage(workouts, newProgress);
  };

  const [editorKey, setEditorKey] = useState(0);

  const openEditor = (w: Workout | null) => {
    setSelectedWorkout(w ? JSON.parse(JSON.stringify(w)) : null);
    setEditorKey(k => k + 1);
    setIsEditing(true);
  };

  const startFromRoutine = (routine: RoutineTemplate) => {
    const newWorkout: Workout = {
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString(),
      title: routine.name,
      entries: routine.exercises.map((ex) => ({
        id: Math.random().toString(36).substring(2, 9),
        exerciseId: ex.exerciseId,
        name: ex.name,
        sets: Array.from({ length: ex.defaultSets }).map((_, idx) => ({
          id: String(idx + 1),
          weight: 20,
          reps: ex.targetReps || 10,
          completed: false,
          rpe: 8,
        })),
      })),
    };
    openEditor(newWorkout);
  };

  return (
    <div className={cn(
      "min-h-screen selection:bg-blue-600/30 font-sans select-none touch-manipulation overscroll-none",
      theme === 'dark' ? 'dark text-white bg-[#000000]' : 'bg-[#f4f7f0] text-slate-800'
    )}>
      {/* Top Global App Bar - Coborâtă complet sub zona de protecție iOS */}
      <div className="max-w-lg mx-auto px-4 pt-[calc(env(safe-area-inset-top,47px)+1.25rem)] pb-3 flex items-center justify-between bg-transparent">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "FitTrack Pro",
                  text: "FitTrack Pro - Aplicație gratuită pentru hipertrofie și jurnal de antrenament!",
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Link-ul FitTrack Pro a fost copiat în clipboard!");
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-zinc-900 border border-white/10 text-[10px] font-black uppercase tracking-wider text-zinc-200 hover:text-blue-500 transition-colors cursor-pointer active:scale-95 duration-150"
            title="Distribuie aplicația"
          >
            <Share2 className="size-3.5 text-blue-500 dark:text-orange-500" />
            <span>Distribuie • Gratuit</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRestTimer(prev => !prev)}
            className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:text-blue-600 cursor-pointer active:scale-95 transition-transform duration-150"
            title="Rest Timer"
          >
            <TimerIcon className="size-4" />
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:text-blue-600 cursor-pointer active:scale-95 transition-transform duration-150"
            title="Sincronizare Cloud & Backup"
          >
            <Cloud className="size-4" />
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:text-blue-600 cursor-pointer active:scale-95 transition-transform duration-150"
            title="Setări"
          >
            <Settings className="size-4" />
          </button>
        </div>
      </div>

      {/* Main Content cu padding de jos calibrat */}
      <main className="max-w-lg mx-auto px-4 pb-[calc(env(safe-area-inset-bottom)+7.5rem)]">
        {activeTab === "home" && (
          <HomeView 
            workouts={workouts} 
            progress={progress} 
            theme={theme}
            isPro={license.isProUser}
            onOpenUpgrade={() => setShowUpgradeModal(true)}
            onOpenRestTimer={() => setShowRestTimer(true)}
            onTabChange={(t) => setActiveTab(t)}
            onAddWorkout={() => openEditor(null)} 
            onSelectWorkout={(w) => openEditor(w)}
            onAddProgress={addWeightEntry}
          />
        )}

        {activeTab === "workouts" && (
          <WorkoutsView 
            workouts={workouts} 
            onAddWorkout={() => openEditor(null)} 
            onDeleteWorkout={(id) => {
              const newWorkouts = workouts.filter(w => w.id !== id);
              setWorkouts(newWorkouts);
              saveToStorage(newWorkouts, progress);
            }} 
            onSelectWorkout={(w) => openEditor(w)}
          />
        )}

        {activeTab === "routines" && (
          <RoutinesView 
            onStartWorkoutFromRoutine={startFromRoutine}
            onUpgradeClick={() => setShowUpgradeModal(true)}
          />
        )}

        {activeTab === "nutrition" && (
          <NutritionView 
            onUpgradeClick={() => setShowUpgradeModal(true)}
          />
        )}

        {activeTab === "coach" && (
          <AiCoachView 
            workouts={workouts}
            onUpgradeClick={() => setShowUpgradeModal(true)}
          />
        )}

        {activeTab === "evolution" && (
          <EvolutionView 
            workouts={workouts} 
            theme={theme} 
            onUpgradeClick={() => setShowUpgradeModal(true)}
          />
        )}
      </main>

      {/* Floating Rest Timer Component */}
      <RestTimer 
        isOpen={showRestTimer} 
        onClose={() => setShowRestTimer(false)}
        initialSeconds={90}
      />

      {/* Full-Screen Workout Editor */}
      <AnimatePresence mode="wait">
        {isEditing && (
          <WorkoutEditor 
            key={`workout-editor-${editorKey}-${selectedWorkout?.id || 'new'}`}
            initialWorkout={selectedWorkout || undefined}
            allWorkouts={workouts}
            onSave={handleSaveWorkout} 
            onCancel={() => {
              setIsEditing(false);
              setSelectedWorkout(null);
            }} 
            onSetCompleted={() => setShowRestTimer(true)}
          />
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tight">
                  Setări FitTrack
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preferințe & Licențiere</p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* License Card */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Status Aplicație
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/20">
                  100% Gratuit • Toate Funcțiile Deblocate
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <p className="text-slate-600 dark:text-zinc-400 font-semibold">
                  Versiune: <span className="font-mono font-bold text-slate-900 dark:text-white">FitTrack Pro Community Edition</span>
                </p>
                <p className="text-slate-600 dark:text-zinc-400 font-semibold">
                  Acces: <span className="font-bold text-slate-900 dark:text-white">Complet Nelimitat</span>
                </p>
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800">
              <div>
                <p className="font-black text-slate-950 dark:text-white text-xs uppercase tracking-wider">Mod Întunecat (Dark)</p>
                <p className="text-[10px] font-bold text-slate-400">Contrast ridicat pentru sală</p>
              </div>
              <button 
                onClick={toggleTheme}
                className={cn(
                  "relative h-8 w-14 rounded-full transition-all duration-300 cursor-pointer shadow-inner",
                  theme === 'dark' ? "bg-blue-600 dark:bg-orange-500" : "bg-slate-300"
                )}
              >
                <motion.div 
                  initial={false}
                  animate={{ x: theme === 'dark' ? 26 : 2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="absolute top-1 size-6 bg-white rounded-full shadow-md"
                />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  setShowExportModal(true);
                }}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 text-left flex justify-between items-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Cloud className="size-5 text-blue-600 dark:text-orange-500" />
                  <span className="text-xs font-black uppercase text-slate-900 dark:text-white">Cloud Sync & Export</span>
                </div>
                <ChevronRight className="size-4 text-slate-400" />
              </button>
            </div>

            {/* App Info */}
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-center space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                FitTrack Pro • Built for Hypertrophy
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Weight Modal */}
      <AnimatePresence>
        {showWeightModal && (
          <div className="fixed inset-0 dark:bg-black/80 bg-black/60 z-[200] flex items-center justify-center p-6 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-sm rounded-[3rem] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black dark:text-zinc-50 text-slate-800 tracking-tighter uppercase leading-none">Cântărire</h3>
                <button onClick={() => setShowWeightModal(false)} className="bg-slate-50 dark:bg-zinc-800 p-2.5 rounded-full text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-transparent cursor-pointer">
                  <X className="size-5 pointer-events-none" />
                </button>
              </div>
              <div className="relative mb-8">
                <input 
                  type="number"
                  autoFocus
                  placeholder="0.0"
                  value={tempWeight}
                  onChange={e => setTempWeight(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-transparent rounded-[2.5rem] py-8 px-8 text-5xl font-black text-center focus:ring-4 focus:ring-blue-600/10 focus:outline-none dark:text-zinc-50 text-slate-800 transition-all"
                />
                <span className="absolute right-10 top-1/2 -translate-y-1/2 font-black text-blue-600 text-sm uppercase tracking-widest">kg</span>
              </div>
              <button 
                onClick={() => {
                  if (tempWeight) {
                    addWeightEntry(parseFloat(tempWeight));
                    setTempWeight("");
                    setShowWeightModal(false);
                  }
                }}
                className="w-full bg-blue-600 dark:bg-orange-500 text-white dark:text-zinc-950 py-6 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/40 active:scale-95 transition-all cursor-pointer"
              >
                Salvează Progres
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Paywall Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={() => setLicense(PurchaseService.getLicense())}
      />

      {/* Cloud Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        workouts={workouts}
        progress={progress}
        onImportData={(importedW, importedP) => {
          setWorkouts(importedW);
          setProgress(importedP);
          saveToStorage(importedW, importedP);
        }}
        onUpgradeClick={() => {
          setShowExportModal(false);
          setShowUpgradeModal(true);
        }}
      />

      {/* Bottom Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
    </div>
  );
}
