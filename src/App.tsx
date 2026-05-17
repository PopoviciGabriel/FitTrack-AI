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
  X
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
import { motion, AnimatePresence } from "motion/react";
import { Workout, ProgressEntry, PRESET_EXERCISES, Exercise, ExerciseEntry, Set } from "./types";
import { cn, formatDate } from "./lib/utils";
import { getWorkoutAdvice } from "./services/geminiService";

// --- Components ---

const Navbar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const tabs = [
    { id: "home", icon: TrendingUp, label: "Acasă" },
    { id: "workouts", icon: Dumbbell, label: "Antrenamente" },
    { id: "exercises", icon: Search, label: "Exerciții" },
    { id: "progress", icon: History, label: "Progres" },
    { id: "settings", icon: Settings, label: "Setări" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 pb-safe z-50 bg-white dark:bg-black/80 backdrop-blur-3xl border-t border-zinc-100 dark:border-white/10 shadow-[0_-15px_40px_rgba(0,0,0,0.03)]">
      <div className="flex justify-around items-center h-20 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full transition-all duration-300 relative group",
              activeTab === tab.id 
                ? "text-[#FF6D00] dark:text-orange-500 scale-105" 
                : "text-[#B0BEC5] hover:text-[#62727B] dark:text-zinc-500 dark:hover:text-zinc-200"
            )}
          >
    <tab.icon className={cn("size-6 mb-1.5 transition-transform", activeTab === tab.id ? "fill-[#FF6D00]/10 text-[#FF6D00]" : "text-[#B0BEC5] dark:text-zinc-500")} />
            <span className={cn(
              "text-[10px] uppercase font-black tracking-[0.1em] transition-opacity",
              activeTab === tab.id ? "opacity-100 text-[#FF6D00]" : "opacity-100 text-[#B0BEC5] dark:text-zinc-500"
            )}>{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="nav-indicator"
                className="absolute -top-px left-1/4 right-1/4 h-0.5 bg-orange-500 rounded-full"
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

const Card = ({ children, className, title }: { children: React.ReactNode, className?: string, title?: string }) => (
  <div className={cn(
    "rounded-[2.5rem] p-8 mb-6 transition-all duration-700",
    "dark:bg-zinc-900/40 dark:border-white/[0.05] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-3xl",
    "bg-white border border-[#E0E0E0]/50 shadow-[0_12px_40px_rgba(0,0,0,0.04)]",
    className
  )}>
    {title && <h3 className="text-[#62727B] dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6">{title}</h3>}
    {children}
  </div>
);

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
      <header className="flex justify-between items-center bg-white dark:bg-[#0A0A0A] sticky top-0 z-20 py-8 border-b border-[#E0E0E0]/40 dark:border-white/5 px-6 -mx-4 transition-all">
        <div>
              <h1 className="text-3xl font-black tracking-tighter text-[#1A1A1B] dark:text-zinc-50 uppercase leading-none">Focus.</h1>
              <p className="text-[#FF6D00] dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1.5 leading-none">Evoluție Constantă</p>
            </div>
            <button onClick={onAddWorkout} className="bg-[#FF6D00] dark:bg-orange-500 hover:bg-orange-600 dark:hover:bg-orange-600 text-white dark:text-black p-4 rounded-[1.5rem] transition-all active:scale-95 shadow-xl shadow-orange-500/20 hover:rotate-2">
              <Plus className="size-6" />
            </button>
          </header>

      {/* AI Advice Card */}
      <Card className="bg-[#FFF8F1] dark:bg-gradient-to-br dark:from-orange-500/[0.05] dark:to-transparent border-[#FF6D00]/10 dark:border-orange-500/20 shadow-none">
        <div className="flex gap-4">
          <div className="bg-[#FF6D00]/10 p-3 rounded-2xl h-fit">
            <Sparkles className="size-5 text-[#FF6D00]" />
          </div>
          <div>
            <h4 className="font-black text-[#FF6D00] dark:text-orange-500 text-[10px] mb-2 uppercase tracking-[0.2em] leading-none">Sfat AI Personalizat</h4>
            <p className={cn("text-[#1A1A1B] dark:text-zinc-300 text-sm font-medium leading-relaxed italic", loadingAdvice && "animate-pulse")}>
              {loadingAdvice ? "Analizăm progresul tău..." : advice || "Încarcă câteva antrenamente pentru a primi sfaturi!"}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Greutate" className="flex flex-col justify-center bg-white border-[#E0E0E0]/30 shadow-md">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black tracking-tight text-[#1A1A1B] dark:text-zinc-50">{recentWeight || "--"}</span>
            <span className="text-[#62727B] dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">kg</span>
          </div>
        </Card>
        <Card title="Antrenamente" className="flex flex-col justify-center bg-white border-[#E0E0E0]/30 shadow-md">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black tracking-tight text-[#1A1A1B] dark:text-zinc-50">{workouts.length}</span>
            <span className="text-[#62727B] dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">total</span>
          </div>
        </Card>
      </div>

      <Card title="Evoluție Greutate">
        <div className="h-[200px] w-full mt-2">
          {progress.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progress}>
                <CartesianGrid strokeDasharray="6 6" stroke={theme === 'dark' ? "#27272a" : "#f1f1f1"} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  hide={true}
                />
                <YAxis hide={true} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', 
                    border: 'none', 
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                  labelFormatter={(v) => formatDate(v)}
                />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#f97316" 
                  strokeWidth={4} 
                  dot={{ r: 0 }} 
                  activeDot={{ r: 6, fill: '#f97316', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500 dark:text-zinc-600 text-xs font-black uppercase tracking-widest italic text-center px-8 opacity-60">
              Introdu cel puțin 2 intrări pentru grafic.
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-[#62727B] dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] px-1">Ultimele Activități</h3>
        {workouts.slice(0, 3).map(w => (
          <div 
            key={w.id} 
            onClick={() => onSelectWorkout(w)}
            className="flex items-center gap-4 p-6 bg-white dark:bg-zinc-900/60 border border-[#E0E0E0]/50 dark:border-white/[0.05] rounded-[2rem] hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all cursor-pointer group shadow-md hover:translate-x-2"
          >
            <div className="bg-[#F5F5F5] dark:bg-zinc-800 p-4 rounded-xl text-[#FF6D00] dark:text-orange-500 group-hover:scale-110 transition-transform shadow-sm">
              <Dumbbell className="size-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-[#1A1A1B] dark:text-zinc-50 text-lg tracking-tight uppercase leading-none">{w.title}</h4>
              <p className="text-[#62727B] dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mt-2 leading-none">
                {formatDate(w.date)} • {w.entries.length} exerciții
              </p>
            </div>
            <ChevronRight className="size-5 text-[#B0BEC5] dark:text-zinc-700 group-hover:translate-x-1 transition-transform" />
          </div>
        ))}
      </div>
    </div>
  );
};

const WorkoutsView = ({ workouts, onAddWorkout, onDeleteWorkout, onSelectWorkout }: { workouts: Workout[], onAddWorkout: () => void, onDeleteWorkout: (id: string) => void, onSelectWorkout: (w: Workout) => void }) => {
  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="py-8 px-6 sticky top-0 bg-white dark:bg-[#0A0A0A] z-20 border-b border-[#E0E0E0]/40 dark:border-white/5 -mx-4 transition-all">
              <h1 className="text-3xl font-black tracking-tighter text-[#1A1A1B] dark:text-zinc-50 uppercase leading-none">Istoric.</h1>
              <p className="text-[#FF6D00] dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1.5 leading-none">Sesiunile Tale</p>
            </header>

      <div className="space-y-5 px-1">
        {workouts.map(w => (
          <div 
            key={w.id} 
            onClick={() => onSelectWorkout(w)}
            className="p-8 bg-white dark:bg-white/[0.03] border border-[#E0E0E0]/50 dark:border-white/5 rounded-[2.5rem] relative group cursor-pointer hover:border-orange-500/20 dark:hover:border-orange-500/30 transition-all shadow-md hover:shadow-xl hover:-translate-y-1"
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if(confirm("Ești sigur că vrei să ștergi acest antrenament?")) {
                  onDeleteWorkout(w.id);
                }
              }}
              className="absolute top-6 right-6 text-[#B0BEC5] dark:text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="size-5" />
            </button>
            <div className="flex justify-between items-start mb-6 pr-8">
              <div>
                <h4 className="font-black text-2xl text-[#1A1A1B] dark:text-zinc-50 leading-tight tracking-tighter uppercase">{w.title}</h4>
                <p className="text-[#62727B] dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-2 leading-none">
                  <Calendar className="size-3 text-[#FF6D00]" /> {formatDate(w.date)}
                </p>
              </div>
              <span className="bg-[#FF6D00]/5 dark:bg-orange-500/10 text-[#FF6D00] dark:text-orange-500 text-[10px] font-black uppercase px-4 py-2 rounded-full border border-[#FF6D00]/20 dark:border-orange-500/20 shrink-0 shadow-xs">
                Finalizat
              </span>
            </div>
            <div className="space-y-3.5">
              {w.entries.slice(0, 4).map((e, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="size-1.5 rounded-full bg-[#FF6D00]" />
                  <p className="text-[#1A1A1B] dark:text-zinc-400 text-sm font-black tracking-tight leading-none">{e.name}</p>
                </div>
              ))}
              {w.entries.length > 3 && (
                <p className="text-zinc-400 dark:text-zinc-600 text-xs font-bold uppercase tracking-[0.1em] mt-2 italic px-4">
                  + încă {w.entries.length - 3} exerciții
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
              className="mt-8 bg-orange-500 text-white dark:text-black font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
            >
              Începe Primul Antrenament
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const WorkoutEditor = ({ onSave, onCancel, initialWorkout, key }: { onSave: (w: Workout) => void, onCancel: () => void, initialWorkout?: Workout, key?: any }) => {
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
        const lastSet = e.sets[e.sets.length - 1];
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
    <div className="fixed inset-0 dark:bg-[#0A0A0A] bg-white z-[100] flex flex-col animate-in slide-in-from-right-full duration-500 shadow-2xl">
      <header className="p-6 border-b border-[#E0E0E0]/40 dark:border-white/5 flex justify-between items-center bg-white dark:bg-[#0A0A0A]">
        <button onClick={onCancel} className="text-[#B0BEC5] dark:text-zinc-500 hover:text-[#FF6D00] transition-colors p-3 bg-[#F5F5F5] dark:bg-white/5 rounded-2xl">
          <ChevronLeft className="size-6" />
        </button>
        
        <div className="flex-1 px-6">
              {isEditingTitle ? (
                <input 
                  autoFocus
                  value={title}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={e => e.key === 'Enter' && setIsEditingTitle(false)}
                  onChange={e => setTitle(e.target.value)}
                  className="bg-transparent font-black text-2xl focus:outline-none w-full text-[#1A1A1B] dark:text-zinc-50 tracking-tighter"
                />
              ) : (
                <h2 
                  onClick={() => setIsEditingTitle(true)}
                  className="font-black text-2xl truncate cursor-pointer hover:text-[#FF6D00] transition-colors flex items-center gap-2 text-[#1A1A1B] dark:text-zinc-50 tracking-tighter"
                >
                  {title} <Edit2 className="size-4 opacity-30" />
                </h2>
              )}
        </div>

        <button 
          onClick={handleSave} 
          disabled={entries.length === 0}
          className="bg-[#FF6D00] text-white dark:text-black px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/30 active:scale-95 transition-all"
        >
          {initialWorkout ? "Update" : "Salvare"}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-32 no-scrollbar">
        {entries.map(entry => (
          <div key={entry.id} className="dark:bg-white/[0.03] bg-white border border-[#E0E0E0]/50 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-md">
            <div className="dark:bg-white/5 bg-[#F5F5F5]/60 p-6 flex justify-between items-center border-b border-[#E0E0E0]/40 dark:border-white/5">
              <h4 className="font-black text-[#62727B] dark:text-orange-500 text-xs uppercase tracking-[0.3em]">{entry.name}</h4>
              <button onClick={() => removeEntry(entry.id)} className="text-[#62727B] dark:text-zinc-600 hover:text-red-500 transition-colors">
                <Trash2 className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-4 text-[10px] text-[#62727B] dark:text-zinc-500 font-black uppercase tracking-[0.3em] text-center">
                <span>Set</span>
                <span>Kg</span>
                <span>Reps</span>
                <span>Done</span>
              </div>
              {entry.sets.map((s, idx) => (
                <div key={s.id} className="grid grid-cols-4 items-center gap-4">
                  <span className="text-center text-[#B0BEC5] dark:text-zinc-500 font-black text-xs">{idx + 1}</span>
                  <input 
                    type="number"
                    value={s.weight || ''}
                    placeholder="0"
                    onChange={e => updateSet(entry.id, s.id, { weight: parseFloat(e.target.value) || 0 })}
                    className="bg-[#F5F5F5] dark:bg-black/40 text-center py-4 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:outline-none text-sm font-black text-[#1A1A1B] dark:text-zinc-50 transition-all border border-[#E0E0E0]/50 dark:border-transparent focus:border-orange-500/20"
                  />
                  <input 
                    type="number"
                    value={s.reps || ''}
                    placeholder="0"
                    onChange={e => updateSet(entry.id, s.id, { reps: parseInt(e.target.value) || 0 })}
                    className="bg-[#F5F5F5] dark:bg-black/40 text-center py-4 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:outline-none text-sm font-black text-[#1A1A1B] dark:text-zinc-50 transition-all border border-[#E0E0E0]/50 dark:border-transparent focus:border-orange-500/20"
                  />
                  <button 
                    onClick={() => updateSet(entry.id, s.id, { completed: !s.completed })}
                    className="flex justify-center transition-all active:scale-75"
                  >
                    {s.completed ? <CheckCircle2 className="size-8 text-[#FF6D00] shadow-[0_0_20px_rgba(255,109,0,0.3)]" /> : <Circle className="size-8 text-[#E0E0E0] dark:text-zinc-900" />}
                  </button>
                </div>
              ))}
              <button 
                onClick={() => addSet(entry.id)}
                className="w-full py-4 border border-dashed border-zinc-200 dark:border-white/10 rounded-[1.5rem] text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.3em] hover:bg-white/30 dark:hover:bg-white/5 transition-all active:scale-95"
              >
                + Adaugă Set
              </button>
            </div>
          </div>
        ))}

        <button 
          onClick={() => setShowSearch(true)}
          className="w-full py-12 border-2 border-dashed border-zinc-200 dark:border-white/5 rounded-[4rem] text-zinc-600 dark:text-zinc-600 font-black flex flex-col items-center gap-4 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-all group backdrop-blur-sm"
        >
          <div className="bg-zinc-100 dark:bg-white/5 p-5 rounded-full group-hover:scale-110 transition-transform">
            <Plus className="size-10 text-zinc-950 dark:text-white" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.4em]">Adaugă Exercițiu</span>
        </button>
      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 35, stiffness: 350 }}
            className="fixed inset-0 dark:bg-[#0A0A0A] bg-white z-[110] p-6 flex flex-col shadow-[0_-20px_100px_rgba(0,0,0,0.4)]"
          >
            <div className="flex items-center gap-6 mb-8 py-4 px-2">
              <button onClick={() => setShowSearch(false)} className="bg-[#F5F5F5] dark:bg-zinc-800 p-4 rounded-[1.2rem] text-[#1A1A1B] dark:text-white active:scale-95 transition-transform border border-[#E0E0E0]/30 dark:border-transparent shadow-sm">
                <ChevronLeft className="size-6" />
              </button>
              <h2 className="text-4xl font-black text-[#1A1A1B] dark:text-zinc-50 tracking-tighter uppercase leading-none">Alege.</h2>
            </div>

            <div className="relative mb-8 px-2">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 size-6 text-[#62727B] dark:text-zinc-400" />
              <input 
                placeholder="Caută în bază..." 
                autoFocus
                className="w-full bg-white dark:bg-black/40 border border-[#E0E0E0] dark:border-white/5 rounded-[1.5rem] py-6 pl-16 pr-8 text-lg focus:outline-none focus:ring-4 focus:ring-orange-500/10 text-[#1A1A1B] dark:text-white font-bold transition-all shadow-md placeholder:text-[#B0BEC5]"
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
                  className="search-exercise-item w-full flex items-center justify-between p-8 bg-white dark:bg-white/[0.03] border border-[#E0E0E0]/30 dark:border-white/5 rounded-[2.5rem] hover:bg-zinc-50 dark:hover:bg-white/10 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  data-name={ex.name}
                  data-category={ex.category}
                >
                  <div className="text-left">
                    <p className="font-black text-[#1A1A1B] dark:text-white text-xl tracking-tight leading-none">{ex.name}</p>
                    <p className="text-[#62727B] dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3 leading-none">{ex.category}</p>
                  </div>
                  <ChevronRight className="size-6 text-[#B0BEC5] dark:text-zinc-800 group-hover:text-[#FF6D00] group-hover:translate-x-2 transition-all" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

  // Persistence
  useEffect(() => {
    const savedWorkouts = localStorage.getItem("workouts");
    const savedProgress = localStorage.getItem("progress");
    const savedTheme = localStorage.getItem("app-theme") as "light" | "dark";
    
    if (savedWorkouts) setWorkouts(JSON.parse(savedWorkouts));
    if (savedProgress) setProgress(JSON.parse(savedProgress));
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
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
    let newWorkouts;
    if (selectedWorkout) {
      newWorkouts = workouts.map(item => item.id === w.id ? w : item);
    } else {
      newWorkouts = [w, ...workouts];
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
      "min-h-screen selection:bg-[#FF6D00]/30 font-sans transition-all duration-700",
      theme === 'dark' ? 'dark dark-bg-mesh text-white' : 'bg-[#FFFFFF] text-[#1A1A1B]'
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
        {activeTab === "exercises" && (
          <div className="space-y-6 pt-0 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="py-8 px-6 sticky top-0 bg-white dark:bg-[#0A0A0A] z-20 border-b border-[#E0E0E0]/40 dark:border-white/5 -mx-4 transition-all">
              <h1 className="text-3xl font-black tracking-tighter text-[#1A1A1B] dark:text-zinc-50 uppercase leading-none">Ghid.</h1>
              <p className="text-[#FF6D00] dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1.5 leading-none">Biblioteca Exerciții</p>
            </header>
            <div className="relative px-2">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 size-5 text-[#62727B] dark:text-zinc-500" />
              <input 
                 placeholder="Caută exercițiu sau grupă..." 
                className="w-full bg-white dark:bg-white/[0.03] border border-[#E0E0E0] dark:border-white/5 rounded-[1.5rem] py-6 pl-16 pr-8 text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/05 backdrop-blur-2xl dark:text-zinc-50 text-[#1A1A1B] font-bold transition-all shadow-md placeholder:text-[#B0BEC5]"
                onChange={(e) => {
                  const term = e.target.value.toLowerCase();
                  const elements = document.querySelectorAll(".exercise-item");
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
            <div className="space-y-3 px-2">
              {PRESET_EXERCISES.map(ex => (
                <div 
                  key={ex.id} 
                  className="exercise-item p-6 bg-white dark:bg-zinc-900/40 border border-[#E0E0E0]/30 dark:border-zinc-800 rounded-[2rem] flex justify-between items-center shadow-sm hover:shadow-md hover:border-orange-500/20 transition-all cursor-default"
                  data-name={ex.name}
                  data-category={ex.category}
                >
                  <div>
                    <h4 className="font-black text-lg dark:text-zinc-100 text-[#1A1A1B] tracking-tight uppercase leading-none">{ex.name}</h4>
                    <p className="text-[#62727B] dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] leading-none mt-2.5">{ex.category}</p>
                  </div>
                  <ChevronRight className="size-5 text-[#B0BEC5] dark:text-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === "progress" && (
          <div className="space-y-6 pt-0 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex justify-between items-center bg-white dark:bg-[#0A0A0A] sticky top-0 z-20 py-8 px-6 -mx-4 border-b border-[#E0E0E0]/40 dark:border-white/5 transition-all">
               <div>
                 <h1 className="text-3xl font-black tracking-tighter text-[#1A1A1B] dark:text-zinc-50 uppercase leading-none">Cifre.</h1>
                 <p className="text-[#FF6D00] dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1.5 leading-none">Evoluție Greutate</p>
               </div>
               <button 
                onClick={() => {
                  setTempWeight("");
                  setShowWeightModal(true);
                }}
                 className="bg-[#FF6D00] dark:bg-orange-500 text-white dark:text-black font-black px-6 py-3 rounded-[1.2rem] text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl shadow-orange-500/20 hover:rotate-1"
               >
                 Adaugă +
               </button>
             </header>
             <Card className="p-2 pt-6 bg-white border-[#E0E0E0]/30 shadow-md">
                <div className="h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progress}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#27272a" : "#E0E0E0"} vertical={false} />
                      <XAxis dataKey="date" tickFormatter={formatDate} stroke="#62727B" fontSize={10} fontVariant="bold" />
                      <YAxis stroke="#62727B" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', 
                          border: theme === 'dark' ? 'none' : '1px solid #E0E0E0', 
                          borderRadius: '16px',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                        }}
                        itemStyle={{ color: '#FF6D00', fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="weight" stroke="#FF6D00" strokeWidth={4} dot={{ fill: '#FF6D00', r: 4 }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
             </Card>
             <div className="space-y-4 px-1">
               {progress.slice().reverse().map(p => (
                 <div key={p.id} className="flex justify-between p-6 bg-white dark:bg-zinc-900/60 border border-[#E0E0E0]/40 dark:border-zinc-800 rounded-[2.5rem] shadow-sm transition-all hover:bg-zinc-50 hover:translate-x-1 hover:shadow-md">
                   <span className="text-[#62727B] dark:text-zinc-400 font-bold uppercase tracking-widest text-[10px] items-center flex">{formatDate(p.date)}</span>
                   <span className="font-black text-[#1A1A1B] dark:text-zinc-50 text-lg tracking-tight">{p.weight} kg</span>
                 </div>
               ))}
             </div>
          </div>
        )}
        {activeTab === "settings" && (
          <div className="space-y-6 pt-0 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="py-8 px-6 sticky top-0 bg-white dark:bg-[#0A0A0A] z-20 border-b border-[#E0E0E0]/40 dark:border-white/5 -mx-4 transition-all">
              <h1 className="text-3xl font-black tracking-tighter text-[#1A1A1B] dark:text-zinc-50 uppercase leading-none">Config.</h1>
              <p className="text-[#62727B] dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1.5 leading-none">Preferințele Tale</p>
            </header>

            <Card className="space-y-1 p-3 border-[#E0E0E0]/30 shadow-md">
              <div className="flex items-center justify-between p-7 rounded-[2rem] bg-white dark:bg-white/[0.05] border border-[#E0E0E0]/20 dark:border-transparent transition-all shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="bg-[#F5F5F5] dark:bg-orange-500/20 p-4 rounded-2xl shadow-xs border border-[#E0E0E0]/30 dark:border-transparent">
                    <Sparkles className="size-7 text-[#FF6D00] dark:text-orange-500" />
                  </div>
                  <div>
                    <p className="font-black text-[#1A1A1B] dark:text-zinc-50 uppercase tracking-widest text-sm">Mod Întunecat</p>
                    <p className="text-[#62727B] dark:text-zinc-400 text-[10px] uppercase font-black tracking-[0.2em] mt-1.5 leading-none">Interfață Deep</p>
                  </div>
                </div>
                <button 
                  onClick={toggleTheme}
                  className={cn(
                    "relative h-10 w-16 rounded-full transition-all duration-500 shadow-inner",
                    theme === 'dark' ? "bg-[#FF6D00]" : "bg-[#E0E0E0]"
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

            <Card className="p-3 border-[#E0E0E0]/30 shadow-md">
              <h3 className="text-[#B0BEC5] dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6 px-6 mt-6">Aplicație</h3>
              <div className="space-y-3 pb-3">
                {/* List of info cards */}
                {[
                  { label: "Versiune", value: "1.2.0-pro", mono: true },
                  { label: "Dezvoltator", value: "Gabriel Popovici" },
                  { label: "Database", value: "Online", status: true }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center px-8 py-6 bg-[#F5F5F5]/40 dark:bg-white/[0.05] border border-[#E0E0E0]/30 dark:border-transparent rounded-[2.5rem] transition-all">
                    <span className="text-[#62727B] dark:text-zinc-400 text-[10px] items-center font-black uppercase tracking-[0.2em]">{item.label}</span>
                    <span className={cn(
                      "text-xs font-black uppercase tracking-widest",
                      item.mono && "font-mono",
                      item.status ? "text-green-600 font-bold" : "text-[#1A1A1B] dark:text-zinc-50"
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
          <div className="fixed inset-0 dark:bg-black bg-black/60 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 border border-[#E0E0E0]/30 dark:border-zinc-800 w-full max-w-sm rounded-[3rem] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black dark:text-zinc-50 text-[#1A1A1B] tracking-tighter uppercase leading-none">Cântărire</h3>
                <button onClick={() => setShowWeightModal(false)} className="bg-[#F5F5F5] dark:bg-zinc-800 p-2.5 rounded-full text-[#B0BEC5] dark:text-zinc-500 border border-[#E0E0E0]/30 dark:border-transparent">
                  <X className="size-5" />
                </button>
              </div>
              <div className="relative mb-8">
                <input 
                  type="number"
                  autoFocus
                  placeholder="0.0"
                  value={tempWeight}
                  onChange={e => setTempWeight(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-zinc-950/50 border border-[#E0E0E0]/30 dark:border-transparent rounded-[2.5rem] py-8 px-8 text-5xl font-black text-center focus:ring-4 focus:ring-[#FF6D00]/10 focus:outline-none dark:text-zinc-50 text-[#1A1A1B] transition-all"
                />
                <span className="absolute right-10 top-1/2 -translate-y-1/2 font-black text-[#FF6D00] text-sm uppercase tracking-widest">kg</span>
              </div>
              <button 
                onClick={() => {
                  if (tempWeight) {
                    addWeightEntry(parseFloat(tempWeight));
                    setTempWeight("");
                    setShowWeightModal(false);
                  }
                }}
                className="w-full bg-[#FF6D00] text-white dark:text-black py-6 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-orange-500/40 active:scale-95 transition-all"
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
