import React, { useState, useEffect, useRef, useOptimistic, startTransition } from "react";
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
import {
  loadProgress,
  loadRoutines,
  loadWorkouts,
  mergeCustomExercises,
  saveRoutines,
  saveWorkoutData,
} from "./services/storageService";
import { isFromAnotherDay } from "./services/algorithmService";
import { openRestTimer, setRestTimerMinimized } from "./services/restTimerService";
import { useCompactOnScroll } from "./lib/useCompactOnScroll";
import { useDockScrub } from "./lib/useDockScrub";
import { UpgradeModal } from "./components/UpgradeModal";
import { TrialBanner, formatTrialDays } from "./components/TrialBanner";
import { ProGuard } from "./components/ProGuard";
import { RestTimer } from "./components/RestTimer";
import { NutritionView } from "./components/NutritionView";
import { AiCoachView } from "./components/AiCoachView";
import { AiCoachSettings } from "./components/AiCoachSettings";
import { RoutinesView } from "./components/RoutinesView";
import { ExportModal } from "./components/ExportModal";
import { HomeView } from "./components/HomeView";
import { WorkoutEditor } from "./components/WorkoutEditor";
import { EvolutionView } from "./components/EvolutionView";

// --- Components ---

// index.css resets box-shadow on every element outside the Tailwind layers, so glass shadows need the important modifier.
const DOCK_GLASS_CLASS =
  "bg-white/65 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)]! " +
  "dark:bg-zinc-900/60 dark:border-white/10 dark:shadow-[0_8px_30px_rgb(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)]!";
const DOCK_PILL_CLASS =
  "rounded-full border backdrop-blur-2xl " +
  "bg-white/40 border-white/80 shadow-[inset_0_2px_3px_rgba(255,255,255,0.95),inset_0_-1.5px_2px_rgba(0,0,0,0.08),0_6px_24px_rgba(0,0,0,0.08)]! " +
  "dark:bg-white/[0.12] dark:border-white/25 dark:shadow-[inset_0_1.5px_2.5px_rgba(255,255,255,0.4),0_6px_24px_rgba(0,0,0,0.5)]!";
const DOCK_PILL_GLOW_CLASS =
  "bg-gradient-to-b from-white/70 via-white/15 to-transparent dark:from-white/25 dark:via-white/[0.05] dark:to-transparent";
/** Shared by the dock and its tabs so the natural/compact resize moves as one piece. */
const DOCK_RESIZE_CLASS = "duration-350 ease-[cubic-bezier(0.25,1,0.5,1)]";
/**
 * The snap to a tab; useDockScrub suspends it while a finger drags the pill.
 * Transform and opacity only, so the slide stays on the compositor while the next view mounts.
 */
const PILL_SLIDE_CLASS =
  "transition-[transform,opacity] duration-320 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform";
/** The pill swells slightly under the finger, with a small spring overshoot. */
const PILL_LIFT_CLASS = "transition-[scale] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]";
const PRESS_RECOIL_CLASS = "transition-transform duration-200 ease-out";

const Navbar = ({ 
  activeTab, 
  setActiveTab 
}: { 
  activeTab: string; 
  setActiveTab: (t: string) => void; 
}) => {
  const tabs = [
    { id: "home", icon: TrendingUp, label: "Acasă" },
    { id: "workouts", icon: Dumbbell, label: "JURNAL" },
    { id: "nutrition", icon: Utensils, label: "Nutriție" },
    { id: "coach", icon: Sparkles, label: "AI COACH" },
    { id: "evolution", icon: Activity, label: "EVOLUȚIE" },
  ];
  // The pill moves on the tap itself; the view swap renders as a transition behind it.
  const [selectedTab, setSelectedTab] = useOptimistic(activeTab);
  const selectTab = (id: string) => {
    startTransition(() => {
      setSelectedTab(id);
      setActiveTab(id);
    });
  };
  const activeIndex = tabs.findIndex((tab) => tab.id === selectedTab);
  const compact = useCompactOnScroll(activeTab);
  const navRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const scrub = useDockScrub({
    surfaceRef: navRef,
    trackRef,
    pillRef,
    count: tabs.length,
    restIndex: activeIndex,
    onSelect: (index) => {
      const tab = tabs[index];
      if (tab) selectTab(tab.id);
    },
  });
  const pillVisible = scrub.index !== null || activeIndex >= 0;
  const highlightedIndex = scrub.index ?? activeIndex;
  const pressedIndex = scrub.pressed ? scrub.index : null;
  const pillLifted = pressedIndex !== null;

  return (
    <nav
      ref={navRef}
      aria-label="Navigare principală"
      className={cn(
        "fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] rounded-full select-none touch-none",
        DOCK_GLASS_CLASS,
        "transition-[max-width,padding]",
        DOCK_RESIZE_CLASS,
        compact ? "max-w-[296px] p-[3px]" : "max-w-[356px] p-1"
      )}
    >
      <div ref={trackRef} className="relative flex items-center w-full">
        {/* No style prop: useDockScrub owns this span's transform. */}
        <span
          ref={pillRef}
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 w-1/5 pointer-events-none",
            PILL_SLIDE_CLASS,
            !pillVisible && "opacity-0"
          )}
        >
          <span
            className={cn(
              "absolute inset-0",
              DOCK_PILL_CLASS,
              PILL_LIFT_CLASS,
              pillLifted && "scale-[1.02]"
            )}
          >
            <span
              className={cn(
                "absolute inset-0 rounded-full transition-opacity duration-200",
                DOCK_PILL_GLOW_CLASS,
                pillLifted ? "opacity-100" : "opacity-0"
              )}
            />
          </span>
        </span>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectTab(tab.id)}
            aria-current={selectedTab === tab.id ? "page" : undefined}
            className={cn(
              // Touch recoil follows the scrub instead: a CSS :active shrink would stay stuck where a scrub began.
              "group relative flex-1 min-w-0 flex items-center justify-center cursor-pointer active:scale-100 active:opacity-100",
              "transition-[padding,color]",
              DOCK_RESIZE_CLASS,
              compact ? "py-2.5" : "py-3.5",
              highlightedIndex === index
                ? "text-blue-600 dark:text-orange-500" 
                : "text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-200"
            )}
          >
            <span
              className={cn(
                "flex flex-col items-center pointer-fine:group-active:scale-[0.96]",
                PRESS_RECOIL_CLASS,
                pressedIndex === index && "scale-[0.96]"
              )}
            >
              <tab.icon className="size-5" />
              <span className="text-[9px] font-medium tracking-tight mt-0.5 leading-none whitespace-nowrap">{tab.label}</span>
            </span>
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
      <header className="pt-2 pb-4 px-6 sticky top-[env(safe-area-inset-top)] bg-[#f4f7f0] dark:bg-[#000000] z-20 -mx-4 transition-all flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-zinc-50 uppercase leading-none">JURNAL</h1>
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

function AppContent() {
  const [activeTab, setActiveTab] = useState("home");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [tempWeight, setTempWeight] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return localStorage.getItem("app-theme") === "light" ? "light" : "dark";
    } catch {
      // storage unavailable: keep the default theme
      return "dark";
    }
  });
  
  // Licensing & Modals State
  const [license, setLicense] = useState<LicenseInfo>(PurchaseService.getLicense());
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Full timer card while training, compact floating pill everywhere else.
  useEffect(() => {
    setRestTimerMinimized(!isEditing);
  }, [isEditing]);

  useEffect(() => {
    setWorkouts(loadWorkouts());
    setProgress(loadProgress());

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
    // iOS paints the standalone status bar with theme-color; the in-app theme can differ from the system one.
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      meta.content = theme === 'dark' ? '#000000' : '#f4f7f0';
    });
    try {
      localStorage.setItem("app-theme", theme);
    } catch {
      // storage unavailable: the theme just won't persist
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const saveToStorage = (ws: Workout[], ps: ProgressEntry[]) => {
    if (!saveWorkoutData(ws, ps)) {
      alert("Nu am putut salva datele pe acest dispozitiv (memorie plină sau stocare blocată). Exportă un backup din meniul Cloud ca să nu pierzi progresul.");
    }
  };

  const handleSaveWorkout = (w: Workout) => {
    const existingIndex = workouts.findIndex(existing => existing.id === w.id);
    let newWorkouts = [...workouts];

    if (existingIndex >= 0) {
      const existingWorkout = newWorkouts[existingIndex];
      const previousEntries = JSON.parse(JSON.stringify(existingWorkout.entries));
      const hasEntriesChanged = JSON.stringify(previousEntries) !== JSON.stringify(w.entries);
      
      const updatedHistory = [...(existingWorkout.history || [])];
      // Only a session from an earlier day becomes history; re-saving today just replaces today's state.
      if (hasEntriesChanged && isFromAnotherDay(existingWorkout.date)) {
        updatedHistory.push({
          date: existingWorkout.date,
          entries: previousEntries,
        });
      }

      newWorkouts[existingIndex] = {
        ...existingWorkout,
        title: w.title,
        date: hasEntriesChanged ? new Date().toISOString() : existingWorkout.date,
        entries: JSON.parse(JSON.stringify(w.entries)),
        history: updatedHistory,
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
      const routinesList = loadRoutines([]);
      if (routinesList.length > 0) {
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
          saveRoutines(updatedRoutines);
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
    if (!Number.isFinite(val) || val <= 0 || val >= 500) return;
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
                  text: "FitTrack Pro - Aplicație pentru hipertrofie și jurnal de antrenament!",
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard
                  ?.writeText(window.location.href)
                  .then(() => alert("Link-ul FitTrack Pro a fost copiat în clipboard!"))
                  .catch(() => alert(window.location.href));
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-zinc-900 border border-white/10 text-[10px] font-black uppercase tracking-wider text-zinc-200 hover:text-blue-500 transition-colors cursor-pointer active:scale-95 duration-150"
            title="Distribuie aplicația"
          >
            <Share2 className="size-3.5 text-blue-500 dark:text-orange-500" />
            <span>Distribuie</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openRestTimer()}
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

      <TrialBanner license={license} onBuyClick={() => setShowUpgradeModal(true)} />

      {/* Main Content cu padding de jos calibrat */}
      <main className="max-w-lg mx-auto px-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)]">
        {activeTab === "home" && (
          <HomeView 
            workouts={workouts} 
            progress={progress} 
            theme={theme}
            isPro={license.isProUser}
            onOpenUpgrade={() => setShowUpgradeModal(true)}
            onOpenRestTimer={() => openRestTimer()}
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
              if (!window.confirm("Ștergi definitiv acest antrenament?")) return;
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
            progress={progress}
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

      {/* Global rest timer over the tabs; the editor renders its own view of the same timer */}
      {!isEditing && <RestTimer placement="screen" />}

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
          />
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md">
          <div className="bg-white/95 dark:bg-[#161618]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] w-full max-w-lg mx-auto max-h-[82dvh] rounded-[28px] shadow-2xl shadow-black/20 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-6 space-y-6">
            <div className="flex justify-between items-center gap-3">
              <div className="min-w-0">
                <h3 className="text-2xl font-semibold text-slate-950 dark:text-white tracking-tight">
                  Setări FitTrack
                </h3>
                <p className="text-[10px] font-medium tracking-tight text-slate-400 mt-0.5">Preferințe, AI & Licențiere</p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* License Card */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Status Aplicație
                </span>
                {license.tier === "trial" ? (
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                    Trial • {formatTrialDays(license.trialDaysLeft ?? 0)}
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/20">
                    Lifetime • Activ
                  </span>
                )}
              </div>

              {license.tier === "trial" ? (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600 dark:text-zinc-400 font-semibold">
                    Acces complet gratuit încă{" "}
                    <span className="font-black text-orange-500">{formatTrialDays(license.trialDaysLeft ?? 0)}</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowUpgradeModal(true);
                    }}
                    className="w-full py-3 rounded-xl bg-orange-500 text-black font-black text-[10px] uppercase tracking-[0.15em] active:scale-95 transition-all cursor-pointer"
                  >
                    Cumpără Acces pe Viață
                  </button>
                </div>
              ) : (
                <div className="space-y-1 text-xs">
                  <p className="text-slate-600 dark:text-zinc-400 font-semibold">
                    Versiune: <span className="font-mono font-bold text-slate-900 dark:text-white">FitTrack Pro Lifetime</span>
                  </p>
                </div>
              )}
            </div>

            <AiCoachSettings />

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
        onImportData={(importedW, importedP, importedCustom) => {
          setWorkouts(importedW);
          setProgress(importedP);
          saveToStorage(importedW, importedP);
          if (importedCustom.length > 0) mergeCustomExercises(importedCustom);
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

export default function App() {
  return (
    <ProGuard>
      <AppContent />
    </ProGuard>
  );
}
