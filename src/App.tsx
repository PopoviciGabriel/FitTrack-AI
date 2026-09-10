import React, { useState, useEffect } from "react";
import { 
  Dumbbell, 
  History, 
  TrendingUp, 
  Plus, 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  Trash2,
  Settings,
  Sparkles,
  Calendar,
  ChevronLeft,
  Edit2,
  X,
  Activity,
  Zap
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { Workout, ProgressEntry, PRESET_EXERCISES, Exercise, ExerciseEntry, Set, WorkoutSnapshot } from "./types";
import { cn, formatDate } from "./lib/utils";
import { getWorkoutAdvice } from "./services/geminiService";

// --- Components ---

const Navbar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const tabs = [
    { id: "home", icon: TrendingUp, label: "Acasă" },
    { id: "workouts", icon: Dumbbell, label: "Antrenamente" },
    { id: "evolution", icon: Activity, label: "Evoluție" },
    { id: "progress", icon: History, label: "Progres" },
    { id: "settings", icon: Settings, label: "Setări" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 pb-safe z-50 bg-white/95 dark:bg-black/80 backdrop-blur-3xl border-t border-slate-200 dark:border-white/10 shadow-[0_-15px_40px_rgba(0,0,0,0.03)]">
      <div className="flex justify-around items-center h-20 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full transition-all duration-300 relative group",
              activeTab === tab.id 
                ? "text-blue-600 dark:text-orange-500 scale-105" 
                : "text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-200"
            )}
          >
            <tab.icon className={cn("size-6 mb-1.5 transition-transform", activeTab === tab.id ? "fill-blue-600/10 text-blue-600" : "text-slate-400 dark:text-zinc-500")} />
            <span className={cn(
              "text-[10px] uppercase font-black tracking-[0.1em] transition-opacity",
              activeTab === tab.id ? "opacity-100 text-blue-600" : "opacity-100 text-slate-400 dark:text-zinc-500"
            )}>{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="nav-indicator"
                className="absolute -top-px left-1/4 right-1/4 h-0.5 bg-blue-600 dark:bg-orange-500 rounded-full"
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

const Card = ({ children, className, title }: { children: React.ReactNode, className?: string, title?: string }) => {
  return (
    <div className={cn(
      "rounded-[2.5rem] p-8 mb-6 transition-all duration-700",
      "bg-white dark:bg-[#1a1a1a] border border-slate-200/60 dark:border-white/[0.05] shadow-[0_12px_30px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-3xl",
      className
    )}>
      {title && (
        <h3 className={cn(
          "text-slate-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6",
          className?.includes("text-center") ? "w-full text-center block" : ""
        )}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};

// --- Views ---

const HomeView = ({ workouts, progress, onAddWorkout, onSelectWorkout, theme }: { workouts: Workout[], progress: ProgressEntry[], onAddWorkout: () => void, onSelectWorkout: (w: Workout) => void, theme: string }) => {
  const [advice, setAdvice] = useState<string>("");
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  useEffect(() => {
    const fetchAdvice = async () => {
      setLoadingAdvice(true);
      const res = await getWorkoutAdvice(workouts.slice(0, 3));
      setAdvice(res || "Ești gata pentru o nouă sesiune?");
      setLoadingAdvice(false);
    };
    if (workouts.length > 0) fetchAdvice();
  }, [workouts]);

  const recentWeight = progress.length > 0 ? progress[progress.length - 1].weight : null;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-center bg-[#f4f7f0] dark:bg-[#0A0A0A] sticky top-0 z-20 py-8 border-b border-slate-200 dark:border-white/5 px-6 -mx-4 transition-all">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-zinc-50 uppercase leading-none">Focus.</h1>
          <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1.5 leading-none">Evoluție Constantă</p>
        </div>
        <button onClick={onAddWorkout} className="bg-blue-600 dark:bg-orange-500 hover:bg-blue-700 dark:hover:bg-orange-600 text-white dark:text-black p-4 rounded-[1.5rem] transition-all active:scale-95 shadow-xl shadow-blue-600/20 hover:rotate-2">
          <Plus className="size-6" />
        </button>
      </header>

      <Card className="bg-blue-50/50 dark:bg-gradient-to-br dark:from-orange-500/[0.05] dark:to-transparent border-blue-100/70 dark:border-orange-500/20 shadow-none">
        <div className="flex gap-4">
          <div className="bg-blue-600/10 p-3 rounded-2xl h-fit">
            <Sparkles className="size-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-black text-blue-600 dark:text-orange-500 text-[10px] mb-2 uppercase tracking-[0.2em] leading-none">Sfat AI Personalizat</h4>
            <p className={cn("text-slate-600 dark:text-zinc-300 text-sm font-medium leading-relaxed italic", loadingAdvice && "animate-pulse")}>
              {loadingAdvice ? "Analizăm progresul tău..." : advice || "Încarcă câteva antrenamente pentru a primi sfaturi!"}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Greutate" className="flex flex-col items-center justify-center border-slate-200/60 dark:border-white/5 shadow-sm text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">{recentWeight || "--"}</span>
            <span className="text-[10px] font-black uppercase tracking-widest leading-none text-slate-500 dark:text-zinc-400">kg</span>
          </div>
        </Card>
        <Card title="Antrenamente" className="flex flex-col items-center justify-center border-slate-200/60 dark:border-white/5 shadow-sm text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">{workouts.length}</span>
            <span className="text-[10px] font-black uppercase tracking-widest leading-none text-slate-500 dark:text-zinc-400">total</span>
          </div>
        </Card>
      </div>

      <Card title="Evoluție Greutate" className="border-slate-200/60 dark:border-white/5 shadow-sm">
        <div className="h-[200px] w-full mt-2">
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

      <div className="space-y-4">
        <h3 className="text-slate-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] px-1">Ultimele Activități</h3>
        {workouts.slice(0, 3).map(w => (
          <div 
            key={w.id} 
            onClick={() => onSelectWorkout(w)}
            className="flex items-center gap-4 p-6 bg-white dark:bg-[#1a1a1a] border border-slate-200/60 dark:border-white/[0.05] rounded-[2rem] hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-all cursor-pointer group shadow-sm hover:shadow-md hover:translate-x-2"
          >
            <div className="bg-slate-100 dark:bg-zinc-800 p-4 rounded-xl text-blue-600 dark:text-orange-500 group-hover:scale-110 transition-transform shadow-sm">
              <Dumbbell className="size-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-slate-950 dark:text-white text-lg tracking-tight uppercase leading-none">{w.title}</h4>
              <p className="text-slate-500 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mt-2 leading-none">
                {formatDate(w.date)} • {w.entries.length} exerciții
              </p>
            </div>
            <ChevronRight className="size-5 text-slate-300 dark:text-zinc-700 group-hover:translate-x-1 transition-transform" />
          </div>
        ))}
      </div>
    </div>
  );
};

const WorkoutsView = ({ workouts, onAddWorkout, onDeleteWorkout, onSelectWorkout }: { workouts: Workout[], onAddWorkout: () => void, onDeleteWorkout: (id: string) => void, onSelectWorkout: (w: Workout) => void }) => {
  const [compareIndex, setCompareIndex] = useState<0 | 1 | 2>(0);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="py-8 px-6 sticky top-0 bg-[#f4f7f0] dark:bg-[#0A0A0A] z-20 border-b border-slate-200 dark:border-white/5 -mx-4 transition-all flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-zinc-50 uppercase leading-none">Istoric.</h1>
          <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1.5 leading-none">Sesiunile Tale</p>
        </div>
        <div>
          <select
            value={compareIndex}
            onChange={(e) => setCompareIndex(Number(e.target.value) as 0 | 1 | 2)}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider py-2.5 px-3.5 rounded-xl text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-orange-500 transition-all cursor-pointer shadow-sm"
          >
            <option value={0}>Current</option>
            <option value={1}>Last Time</option>
            <option value={2}>2 Times Ago</option>
          </select>
        </div>
      </header>

      <div className="space-y-5 px-1">
        {workouts.map(w => {
          let displayEntries = w.entries;
          let displayDate = w.date;

          const hasEnoughHistory = compareIndex === 0 || (w.history && w.history.length >= compareIndex);
          if (!hasEnoughHistory) return null;

          if (compareIndex > 0 && w.history) {
            const historicalSnapshot = w.history[compareIndex - 1];
            displayEntries = historicalSnapshot.entries;
            displayDate = historicalSnapshot.date;
          }

          return (
            <div 
              key={w.id} 
              onClick={() => {
                let workoutToEdit = { ...w };
                
                if (compareIndex > 0 && w.history && w.history.length >= compareIndex) {
                  const historicalSnapshot = w.history[compareIndex - 1];
                  workoutToEdit = {
                    ...w,
                    date: historicalSnapshot.date,
                    entries: historicalSnapshot.entries,
                  };
                }
                
                onSelectWorkout(workoutToEdit);
              }}
              className="p-8 bg-white dark:bg-[#1a1a1a] border border-slate-200/60 dark:border-white/5 rounded-[2.5rem] cursor-pointer hover:border-blue-500/20 dark:hover:border-orange-500/30 transition-all shadow-sm hover:shadow-md hover:-translate-y-1 relative group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-2xl text-slate-950 dark:text-white leading-tight tracking-tighter uppercase pr-2">{w.title}</h4>
                  <p className="text-slate-500 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-2 leading-none">
                    <Calendar className="size-3 text-blue-600 dark:text-orange-500" /> {formatDate(displayDate)}
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
                  className="p-3.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 relative z-50 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Șterge antrenament"
                >
                  <Trash2 className="size-5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-5 mt-6">
                {displayEntries.slice(0, 4).map((e, idx) => (
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
                          {s.weight}kg x {s.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {displayEntries.length > 4 && (
                  <p className="text-slate-400 dark:text-zinc-600 text-xs font-bold uppercase tracking-[0.1em] mt-2 italic px-4">
                    + încă {displayEntries.length - 4} exerciții
                  </p>
                )}
              </div>
            </div>
          );
        })}
        
        {workouts.length === 0 && (
          <div className="text-center py-24 flex flex-col items-center">
            <div className="bg-zinc-100 dark:bg-zinc-900 p-8 rounded-[3rem] mb-6">
              <Dumbbell className="size-16 text-zinc-300 dark:text-zinc-800" />
            </div>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm font-black uppercase tracking-widest italic">Niciun antrenament înregistrat.</p>
            <button 
              onClick={onAddWorkout}
              className="mt-8 bg-orange-500 text-white dark:text-black font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
            >
              Începe Primul Antrenament
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const WorkoutEditor = ({ onSave, onCancel, initialWorkout }: { onSave: (w: Workout) => void, onCancel: () => void, initialWorkout?: Workout, key?: string }) => {
  const [title, setTitle] = useState(initialWorkout?.title || "Antrenament Nou");
  const [entries, setEntries] = useState<ExerciseEntry[]>(initialWorkout?.entries || []);
  const [showSearch, setShowSearch] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const addExercise = (ex: Exercise) => {
    const newEntry: ExerciseEntry = {
      id: Math.random().toString(36).substr(2, 9),
      exerciseId: ex.id,
      name: ex.name,
      sets: [{ id: "1", weight: 0, reps: 0, completed: false }]
    };
    setEntries([...entries, newEntry]);
    setShowSearch(false);
  };

  const updateSet = (entryId: string, setId: string, updates: Partial<Set>) => {
    setEntries(entries.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          sets: e.sets.map(s => s.id === setId ? { ...s, ...updates } : s)
        };
      }
      return e;
    }));
  };

  const addSet = (entryId: string) => {
    setEntries(entries.map(e => {
      if (e.id === entryId) {
        const lastSet = e.sets[e.sets.length - 1] || { weight: 0, reps: 0 };
        return {
          ...e,
          sets: [...e.sets, { id: Math.random().toString(36).substr(2, 9), weight: lastSet.weight, reps: lastSet.reps, completed: false }]
        };
      }
      return e;
    }));
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const handleSave = () => {
    if (entries.length === 0) return;
    onSave({
      id: initialWorkout?.id || Math.random().toString(36).substr(2, 9),
      date: initialWorkout?.date || new Date().toISOString(),
      title,
      entries
    });
  };

  return (
    <div className="fixed inset-0 bg-[#f4f7f0] dark:bg-[#0A0A0A] z-[100] flex flex-col animate-in slide-in-from-right-full duration-500 shadow-2xl">
      <header className="px-4 py-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-white dark:bg-[#0A0A0A] gap-2">
        <button onClick={onCancel} className="text-slate-400 dark:text-zinc-500 hover:text-blue-600 transition-colors p-2.5 bg-slate-50 dark:bg-white/5 rounded-xl shrink-0 cursor-pointer">
          <ChevronLeft className="size-5" />
        </button>
        
        <div className="flex-1 px-1 min-w-0">
          {isEditingTitle ? (
            <input 
              autoFocus
              value={title}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={e => e.key === 'Enter' && setIsEditingTitle(false)}
              onChange={e => setTitle(e.target.value)}
              className="bg-transparent font-black text-xl focus:outline-none w-full text-black dark:text-zinc-50 tracking-tighter"
            />
          ) : (
            <h2 
              onClick={() => setIsEditingTitle(true)}
              className="font-black text-xl truncate cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-1.5 text-black dark:text-zinc-50 tracking-tighter"
            >
              {title} <Edit2 className="size-3.5 opacity-30 shrink-0" />
            </h2>
          )}
        </div>

        <button 
          onClick={handleSave} 
          disabled={entries.length === 0}
          className="bg-blue-600 dark:bg-orange-500 text-white dark:text-zinc-950 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-blue-600/20 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          {initialWorkout ? "Update" : "Salvare"}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-32 no-scrollbar">
        {entries.map(entry => (
          <div key={entry.id} className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="bg-slate-50 dark:bg-white/5 p-6 flex justify-between items-center border-b border-slate-200 dark:border-white/5">
              <h4 className="font-black text-slate-950 dark:text-orange-500 text-xs uppercase tracking-[0.2em]">{entry.name}</h4>
              <button onClick={() => removeEntry(entry.id)} className="text-slate-300 dark:text-zinc-600 hover:text-red-500 transition-colors cursor-pointer">
                <Trash2 className="size-5 pointer-events-none" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-4 text-[10px] text-slate-400 dark:text-zinc-500 font-black uppercase tracking-[0.3em] text-center">
                <span>Set</span>
                <span>Kg</span>
                <span>Reps</span>
                <span>Done</span>
              </div>
              {entry.sets.map((s, idx) => (
                <div key={s.id} className="grid grid-cols-4 items-center gap-4">
                  <span className="text-center text-slate-400 dark:text-zinc-500 font-black text-xs">{idx + 1}</span>
                  <input 
                    type="number"
                    value={s.weight || ''}
                    placeholder="0"
                    onChange={e => updateSet(entry.id, s.id, { weight: parseFloat(e.target.value) || 0 })}
                    className="bg-slate-50 dark:bg-black/40 text-center py-4 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:outline-none text-sm font-black text-slate-800 dark:text-zinc-50 transition-all border border-slate-200/60 dark:border-transparent focus:border-blue-600/20"
                  />
                  <input 
                    type="number"
                    value={s.reps || ''}
                    placeholder="0"
                    onChange={e => updateSet(entry.id, s.id, { reps: parseInt(e.target.value) || 0 })}
                    className="bg-slate-50 dark:bg-black/40 text-center py-4 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:outline-none text-sm font-black text-slate-800 dark:text-zinc-50 transition-all border border-slate-200/60 dark:border-transparent focus:border-blue-600/20"
                  />
                  <button 
                    onClick={() => updateSet(entry.id, s.id, { completed: !s.completed })}
                    className="flex justify-center transition-all active:scale-75 cursor-pointer"
                  >
                    {s.completed ? <CheckCircle2 className="size-8 text-blue-600 dark:text-orange-500 shadow-[0_0_20px_rgba(37,99,235,0.2)] dark:shadow-[0_0_20px_rgba(255,109,0,0.3)] pointer-events-none" /> : <Circle className="size-8 text-slate-200 dark:text-zinc-900 pointer-events-none" />}
                  </button>
                </div>
              ))}
              <button 
                onClick={() => addSet(entry.id)}
                className="w-full py-4 border border-dashed border-slate-200 dark:border-white/10 rounded-[1.5rem] text-[10px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-[0.3em] bg-white dark:bg-transparent hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
              >
                + Adaugă Set
              </button>
            </div>
          </div>
        ))}

        <button 
          onClick={() => setShowSearch(true)}
          className="w-full py-12 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[4rem] bg-white dark:bg-transparent text-slate-400 dark:text-zinc-600 font-black flex flex-col items-center gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all group backdrop-blur-sm cursor-pointer"
        >
          <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-full group-hover:scale-110 transition-transform border border-slate-100 dark:border-transparent">
            <Plus className="size-10 text-black dark:text-white pointer-events-none" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.4em] pointer-events-none">Adaugă Exercițiu</span>
        </button>
      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 35, stiffness: 350 }}
            className="fixed inset-0 bg-[#f4f7f0] dark:bg-[#0A0A0A] z-[110] p-6 flex flex-col shadow-[0_-20px_100px_rgba(0,0,0,0.4)]"
          >
            <div className="flex items-center gap-6 mb-8 py-4 px-2">
              <button onClick={() => setShowSearch(false)} className="bg-white dark:bg-zinc-800 p-4 rounded-[1.2rem] text-black dark:text-white active:scale-95 transition-transform border border-slate-200 dark:border-transparent shadow-sm cursor-pointer">
                <ChevronLeft className="size-6 pointer-events-none" />
              </button>
              <h2 className="text-4xl font-black text-black dark:text-zinc-50 tracking-tighter uppercase leading-none">Alege.</h2>
            </div>

            <div className="relative mb-8 px-2">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 size-6 text-slate-400 dark:text-zinc-400" />
              <input 
                placeholder="Caută în bază..." 
                autoFocus
                className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-[1.5rem] py-6 pl-16 pr-8 text-lg focus:outline-none focus:ring-4 focus:ring-blue-600/10 text-black dark:text-white font-bold transition-all shadow-sm placeholder:text-slate-300"
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

            <div className="space-y-3 overflow-y-auto pb-12 no-scrollbar px-2">
              {PRESET_EXERCISES.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex)}
                  className="search-exercise-item w-full flex items-center justify-between p-8 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/5 rounded-[2.5rem] hover:bg-slate-50 dark:hover:bg-white/10 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                  data-name={ex.name}
                  data-category={ex.category}
                >
                  <div className="text-left pointer-events-none">
                    <p className="font-black text-black dark:text-white text-xl tracking-tight leading-none">{ex.name}</p>
                    <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3 leading-none">{ex.category}</p>
                  </div>
                  <ChevronRight className="size-6 text-slate-300 dark:text-zinc-800 group-hover:text-blue-600 group-hover:translate-x-2 transition-all pointer-events-none" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- NOUA SECȚIUNE DE EVOLUȚIE (STATISTICI COMPLEXE) ---
const StatBox = ({ label, value, trend, hideTrend = false }: { label: string, value: string | number, trend: number, hideTrend?: boolean }) => (
  <div className="bg-slate-50 dark:bg-white/[0.02] rounded-2xl p-4 border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden">
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1.5">{label}</p>
    <p className="text-xl font-black text-slate-900 dark:text-zinc-100 leading-none">{value}</p>
    {!hideTrend && trend !== 0 && (
      <p className={cn("text-[9px] font-black mt-2 px-2 py-0.5 rounded-md uppercase tracking-wider", 
        trend > 0 ? "bg-green-500/10 text-green-600 dark:text-green-500" : "bg-red-500/10 text-red-500 dark:text-red-400"
      )}>
        {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
      </p>
    )}
    {!hideTrend && trend === 0 && (
      <p className="text-[9px] font-black mt-2 text-slate-300 dark:text-zinc-600 uppercase tracking-wider">
        Stabil
      </p>
    )}
  </div>
);

const EvolutionView = ({ workouts, theme }: { workouts: Workout[], theme: "light" | "dark" }) => {
  const workoutEvolutions = workouts.map(w => {
    const timeline = [...(w.history || [])].reverse().map(snap => ({
      date: snap.date,
      entries: snap.entries
    })).concat({
      date: w.date,
      entries: w.entries
    });

    const statsTimeline = timeline.map(pt => {
        let volume = 0;
        let reps = 0;
        let max1RM = 0;

        pt.entries.forEach(entry => {
           const completedSets = entry.sets.filter(s => s.completed);
           const activeSets = completedSets.length > 0 ? completedSets : entry.sets; // Aici e plasa de siguranță!
           
           activeSets.forEach(s => {
               const weight = s.weight || 0;
               const r = s.reps || 0;
               volume += weight * r;
               reps += r;
               const est1RM = r > 1 ? weight * (1 + r / 30) : weight;
               if (est1RM > max1RM) max1RM = est1RM;
           });
        });

        return {
           date: pt.date,
           volume,
           reps,
           max1RM: Math.round(max1RM),
           entries: pt.entries
        };
    });

    const currentStats = statsTimeline[statsTimeline.length - 1];
    const previousStats = statsTimeline.length > 1 ? statsTimeline[statsTimeline.length - 2] : null;

    let volumeGrowth = 0;
    let oneRMGrowth = 0;

    if (previousStats) {
      if (previousStats.volume > 0) volumeGrowth = ((currentStats.volume - previousStats.volume) / previousStats.volume) * 100;
      if (previousStats.max1RM > 0) oneRMGrowth = ((currentStats.max1RM - previousStats.max1RM) / previousStats.max1RM) * 100;
    }

    const topExercises: {name: string, growthPct: number, c1RM: number}[] = [];
    if (previousStats) {
       currentStats.entries.forEach(currEntry => {
           const prevEntry = previousStats.entries.find(e => 
             (e.exerciseId && e.exerciseId === currEntry.exerciseId) || 
             e.name.toLowerCase() === currEntry.name.toLowerCase()
           );
           
           if (prevEntry) {
               let c1RM = 0, p1RM = 0;
               
               // Plasa de siguranță aplicată și aici
               const cCompleted = currEntry.sets.filter(s=>s.completed);
               const cActive = cCompleted.length > 0 ? cCompleted : currEntry.sets;
               cActive.forEach(s => { 
                 const est = s.reps > 1 ? s.weight * (1 + s.reps / 30) : s.weight; 
                 if(est > c1RM) c1RM = est; 
               });
               
               const pCompleted = prevEntry.sets.filter(s=>s.completed);
               const pActive = pCompleted.length > 0 ? pCompleted : prevEntry.sets;
               pActive.forEach(s => { 
                 const est = s.reps > 1 ? s.weight * (1 + s.reps / 30) : s.weight; 
                 if(est > p1RM) p1RM = est; 
               });

               if (c1RM > p1RM && p1RM > 0) {
                   topExercises.push({
                       name: currEntry.name,
                       growthPct: ((c1RM - p1RM) / p1RM) * 100,
                       c1RM: Math.round(c1RM)
                   });
               }
           }
       });
    }
    
    topExercises.sort((a,b) => b.growthPct - a.growthPct);

    return {
        id: w.id,
        title: w.title,
        sessionsCount: timeline.length,
        statsTimeline,
        currentStats,
        volumeGrowth,
        oneRMGrowth,
        topExercises: topExercises.slice(0, 3) 
    };
  });

  const validEvolutions = workoutEvolutions.filter(we => we.currentStats && we.currentStats.volume > 0);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="py-8 px-6 sticky top-0 bg-[#f4f7f0] dark:bg-[#0A0A0A] z-20 border-b border-slate-200 dark:border-white/5 -mx-4 transition-all">
        <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-zinc-50 uppercase leading-none">Evoluție.</h1>
        <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1.5 leading-none">Analiză Statistică</p>
      </header>

      <div className="space-y-6 px-1">
        {validEvolutions.map((we, wIdx) => (
          <div key={we.id} className="p-7 bg-white dark:bg-[#1a1a1a] border border-slate-200/60 dark:border-white/5 rounded-[2.5rem] shadow-sm relative overflow-hidden">
            
            <div className="flex justify-between items-baseline mb-6">
              <div>
                <h3 className="font-black text-2xl text-slate-950 dark:text-white tracking-tighter uppercase leading-none">
                  {we.title}
                </h3>
                <p className="text-slate-500 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2.5 flex items-center gap-1.5">
                  <Activity className="size-3 text-blue-600 dark:text-orange-500" />
                  {we.sessionsCount} Versiuni Analizate
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
               <StatBox label="Volum" value={we.currentStats.volume + 'kg'} trend={we.volumeGrowth} />
               <StatBox label="1RM Est." value={we.currentStats.max1RM + 'kg'} trend={we.oneRMGrowth} />
               <StatBox label="Repetări" value={we.currentStats.reps} trend={0} hideTrend />
            </div>

            {we.statsTimeline.length > 1 && (
              <div className="mb-6 border-t border-b border-slate-100 dark:border-white/[0.03] py-5">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-4 text-center">Trend Volum</p>
                <div className="h-28 w-full -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={we.statsTimeline}>
                      <defs>
                        <linearGradient id={`colorVol-${wIdx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={theme === 'dark' ? '#f97316' : '#2563eb'} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={theme === 'dark' ? '#f97316' : '#2563eb'} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Tooltip 
                        contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', border: 'none', borderRadius: '12px' }}
                        itemStyle={{ color: theme === 'dark' ? '#f97316' : '#2563eb', fontWeight: 'bold' }}
                        labelFormatter={() => ''}
                        formatter={(val: number) => [`${val} kg`, 'Volum']}
                      />
                      <Area type="monotone" dataKey="volume" stroke={theme === 'dark' ? '#f97316' : '#2563eb'} strokeWidth={3} fillOpacity={1} fill={`url(#colorVol-${wIdx})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {we.topExercises.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-zinc-200 mb-3 flex items-center gap-1.5">
                  <Zap className="size-3 text-green-500" />
                  Top Creșteri 1RM
                </p>
                <div className="space-y-2">
                  {we.topExercises.map((ex, eIdx) => (
                    <div key={eIdx} className="flex justify-between items-center bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl">
                      <span className="font-bold text-xs text-slate-700 dark:text-zinc-300 uppercase tracking-wide truncate pr-4">{ex.name}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-sm text-slate-950 dark:text-white">{ex.c1RM}kg</span>
                        <span className="text-[10px] font-black text-green-600 dark:text-green-500 bg-green-500/10 px-2 py-1 rounded-md">+{ex.growthPct.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ))}

        {validEvolutions.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-[#1a1a1a] border border-slate-200/60 dark:border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center shadow-sm">
            <div className="bg-zinc-100 dark:bg-zinc-900 p-6 rounded-[2.5rem] mb-6 shadow-inner">
              <Activity className="size-12 text-zinc-300 dark:text-zinc-800" />
            </div>
            <h4 className="font-black text-lg text-slate-900 dark:text-zinc-250 tracking-tight uppercase leading-none mb-3">Fără Date Statistice</h4>
            <p className="text-zinc-400 dark:text-zinc-500 text-xs font-black uppercase tracking-widest italic leading-relaxed max-w-[280px]">
              Completează antrenamente cu greutăți pentru a debloca algoritmul de analiză avansată!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [tempWeight, setTempWeight] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

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
      
      const snapshot: WorkoutSnapshot = {
        date: existingWorkout.date,
        entries: JSON.parse(JSON.stringify(existingWorkout.entries))
      };
      
      const currentHistory = existingWorkout.history || [];

      newWorkouts[existingIndex] = {
        ...existingWorkout,
        date: new Date().toISOString(),
        title: w.title,
        entries: JSON.parse(JSON.stringify(w.entries)),
        history: [snapshot, ...currentHistory]
      };
    } else {
      const newWorkout: Workout = {
        ...JSON.parse(JSON.stringify(w)),
        date: new Date().toISOString(),
        history: []
      };
      newWorkouts = [newWorkout, ...newWorkouts];
    }

    setWorkouts(newWorkouts);
    setIsEditing(false);
    setSelectedWorkout(null);
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

  return (
    <div className={cn(
      "min-h-screen selection:bg-blue-600/30 font-sans transition-all duration-700",
      theme === 'dark' ? 'dark dark-bg-mesh text-white bg-black' : 'bg-[#f4f7f0] text-slate-800'
    )}>
      <div className="max-w-lg mx-auto px-4">
        {activeTab === "home" && (
          <HomeView 
            workouts={workouts} 
            progress={progress} 
            theme={theme}
            onAddWorkout={() => {
              setSelectedWorkout(null);
              setIsEditing(true);
            }} 
            onSelectWorkout={(w) => {
              setSelectedWorkout(w);
              setIsEditing(true);
            }}
          />
        )}
        {activeTab === "workouts" && (
          <WorkoutsView 
            workouts={workouts} 
            onAddWorkout={() => {
              setSelectedWorkout(null);
              setIsEditing(true);
            }} 
            onDeleteWorkout={(id) => {
              const newWorkouts = workouts.filter(w => w.id !== id);
              setWorkouts(newWorkouts);
              saveToStorage(newWorkouts, progress);
            }} 
            onSelectWorkout={(w) => {
              setSelectedWorkout(w);
              setIsEditing(true);
            }}
          />
        )}
        {activeTab === "evolution" && (
          <EvolutionView workouts={workouts} theme={theme} />
        )}
        {activeTab === "progress" && (
          <div className="space-y-6 pt-0 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex justify-between items-center bg-[#f4f7f0] dark:bg-[#0A0A0A] sticky top-0 z-20 py-8 px-6 -mx-4 border-b border-slate-200 dark:border-white/5 transition-all">
               <div>
                 <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-zinc-50 uppercase leading-none">Cifre.</h1>
                 <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1.5 leading-none">Evoluție Greutate</p>
               </div>
               <button 
                onClick={() => {
                  setTempWeight("");
                  setShowWeightModal(true);
                }}
                 className="bg-blue-600 dark:bg-orange-500 text-white dark:text-zinc-950 font-black px-6 py-3 rounded-[1.2rem] text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl shadow-blue-600/20 hover:rotate-1 cursor-pointer"
               >
                 Adaugă +
               </button>
             </header>
             <Card className="p-2 pt-6 border-slate-200/60 dark:border-white/5 shadow-sm">
                <div className="h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={progress}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#27272a" : "#F1F5F9"} vertical={false} />
                      <XAxis dataKey="date" tickFormatter={formatDate} stroke="#94A3B8" fontSize={10} fontVariant="bold" />
                      <YAxis stroke="#94A3B8" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', 
                          border: theme === 'dark' ? 'none' : '1px solid #F1F5F9', 
                          borderRadius: '16px',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                        }}
                        itemStyle={{ color: theme === 'dark' ? '#f97316' : '#2563EB', fontWeight: 'bold' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke={theme === 'dark' ? '#f97316' : '#2563EB'} 
                        strokeWidth={4} 
                        dot={{ fill: theme === 'dark' ? '#f97316' : '#2563EB', r: 4 }} 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
             </Card>
             <div className="space-y-4 px-1">
               {progress.slice().reverse().map(p => (
                 <div key={p.id} className="flex justify-between p-6 bg-white dark:bg-[#1a1a1a] border border-slate-200/60 dark:border-zinc-800 rounded-[2.5rem] shadow-sm transition-all hover:bg-slate-50 hover:translate-x-1 hover:shadow-md">
                   <span className="text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-widest text-[10px] items-center flex">{formatDate(p.date)}</span>
                   <span className="font-black text-slate-950 dark:text-white text-lg tracking-tight">{p.weight} kg</span>
                 </div>
               ))}
             </div>
          </div>
        )}
        {activeTab === "settings" && (
          <div className="space-y-6 pt-0 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="py-8 px-6 sticky top-0 bg-[#f4f7f0] dark:bg-[#0A0A0A] z-20 border-b border-slate-200 dark:border-white/5 -mx-4 transition-all">
              <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-zinc-50 uppercase leading-none">Config.</h1>
              <p className="text-slate-500 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1.5 leading-none">Preferințele Tale</p>
            </header>

            <Card className="space-y-1 p-3 border-slate-200/60 shadow-sm">
              <div className="flex items-center justify-between p-7 rounded-[2rem] bg-white dark:bg-white/[0.05] border border-slate-200/60 dark:border-transparent transition-all shadow-sm text-slate-950 dark:text-white">
                <div className="flex items-center gap-5">
                  <div className="bg-slate-50 dark:bg-orange-500/20 p-4 rounded-2xl shadow-xs border border-slate-200/60 dark:border-transparent">
                    <Sparkles className="size-7 text-blue-600 dark:text-orange-500" />
                  </div>
                  <div>
                    <p className="font-black text-slate-950 dark:text-white uppercase tracking-widest text-sm">Mod Întunecat</p>
                    <p className="text-slate-500 dark:text-zinc-400 text-[10px] uppercase font-black tracking-[0.2em] mt-1.5 leading-none">Interfață Deep</p>
                  </div>
                </div>
                <button 
                  onClick={toggleTheme}
                  className={cn(
                    "relative h-10 w-16 rounded-full transition-all duration-500 shadow-inner cursor-pointer",
                    theme === 'dark' ? "bg-orange-500" : "bg-slate-200"
                  )}
                >
                  <motion.div 
                    initial={false}
                    animate={{ x: theme === 'dark' ? 32 : 4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="absolute top-1 size-8 bg-white rounded-full shadow-lg"
                  />
                </button>
              </div>
            </Card>

            <Card className="p-3 border-slate-200/60 shadow-sm">
              <h3 className="text-slate-800 dark:text-white text-[10px] font-black uppercase tracking-[0.3em] mb-6 px-6 mt-6">Aplicație</h3>
              <div className="space-y-3 pb-3">
                {[
                  { label: "Versiune", value: "2.0.0-pro", mono: true },
                  { label: "Dezvoltator", value: "Gabriel Popovici" },
                  { label: "Database", value: "Online", status: true }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center px-8 py-6 bg-white dark:bg-white/[0.05] border border-slate-200/60 dark:border-transparent rounded-[2.5rem] transition-all shadow-sm">
                    <span className="text-slate-950 dark:text-white text-[10px] items-center font-black uppercase tracking-[0.2em]">{item.label}</span>
                    <span className={cn(
                      "text-xs font-black uppercase tracking-widest text-slate-700 dark:text-white",
                      item.mono && "font-mono",
                      item.status ? "text-green-600 dark:text-green-500 font-bold" : ""
                    )}>
                      {item.status && <CheckCircle2 className="size-3 inline mr-1" />}
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="text-center py-8">
              <div className="inline-block p-1 bg-zinc-100 dark:bg-zinc-900/50 rounded-full mb-4">
                <div className="flex gap-1">
                  {[1,2,3].map(i => <div key={i} className="size-1 rounded-full bg-orange-500" />)}
                </div>
              </div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-300 dark:text-zinc-800 font-black">
                Proiectat pentru performanță extremă
              </p>
            </div>
          </div>
        )}

      <AnimatePresence mode="wait">
        {isEditing && (
          <WorkoutEditor 
            key={selectedWorkout?.id || 'new-workout'}
            initialWorkout={selectedWorkout || undefined}
            onSave={handleSaveWorkout} 
            onCancel={() => {
              setIsEditing(false);
              setSelectedWorkout(null);
            }} 
          />
        )}
      </AnimatePresence>

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

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}