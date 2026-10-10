import React, { useState, useEffect, useMemo } from "react";
import { 
  Sparkles, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Flame, 
  ArrowUpRight, 
  RefreshCw, 
  Brain, 
  Send, 
  Calendar, 
  Clock, 
  Target, 
  HelpCircle,
  TrendingUp,
  ShieldCheck,
  RotateCcw,
  Copy,
  Check,
  Trash2,
  MessageSquare,
  Lightbulb
} from "lucide-react";
import { ChatMessage, Workout } from "../types";
import { ProGuard } from "./ProGuard";
import { analyzeWorkoutVolume, askAiCoachQuestion, formatAnalysisSummary, getAiErrorMessage } from "../services/geminiService";
import { loadChatMessages, saveChatMessages } from "../services/storageService";
import { cn, formatDate, formatWeekdayDate } from "../lib/utils";
import { buildDailySessions, toLocalDayKey } from "../services/algorithmService";

interface AiCoachViewProps {
  workouts: Workout[];
  onUpgradeClick: () => void;
}

// -------------------------------------------------------------
// PURE SPORTS SCIENCE ALGORITHMIC MODELS
// -------------------------------------------------------------

export const PROGRESSIVE_OVERLOAD_PRINCIPLES = [
  {
    title: "Double Progression",
    desc: "Când atingi limita superioară a intervalului de repetări (ex: 3×10), crește greutatea cu 1.25–2.5 kg la următoarea sesiune.",
  },
  {
    title: "RPE 8–9 (Repetări în Rezervă)",
    desc: "Păstrează 1-2 repetări în rezervă pe mișcările compuse grele pentru a preveni epuizarea prematură a sistemului nervos central.",
  },
  {
    title: "Regenerare Proteică & Somn",
    desc: "Asigură 7–9 ore de somn profund și 1.8–2.2g proteine / kg corp pentru a susține sinteza proteică musculară post-antrenament.",
  },
];

interface FlatSession {
  date: string;
  /** Local calendar day, YYYY-MM-DD. */
  dayKey: string;
  title: string;
  timestamp: number;
  entries: {
    name: string;
    sets: { weight: number; reps: number; completed: boolean; rpe?: number }[];
  }[];
}

interface ExerciseDayPoint {
  date: string;
  bestWeight: number;
  bestReps: number;
  sessionVolume: number;
}

/**
 * One session per workout per calendar day (the last saved state of that day),
 * oldest first. Several edits made on the same day count as a single session.
 */
function extractAllSessions(workouts: Workout[]): FlatSession[] {
  return buildDailySessions(workouts).map((session) => ({
    date: session.date,
    dayKey: session.dayKey,
    title: session.title,
    timestamp: session.timestamp,
    entries: session.entries.map((e) => ({
      name: e.name,
      sets: e.sets.map((s) => ({
        weight: s.weight || 0,
        reps: s.reps || 0,
        completed: s.completed,
        rpe: s.rpe,
      })),
    })),
  }));
}

function getMuscleCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("bench") || n.includes("chest") || n.includes("piept") || n.includes("fly") || n.includes("push-up") || n.includes("dip") || n.includes("pec")) {
    return "Piept (Chest)";
  }
  if (n.includes("row") || n.includes("pull") || n.includes("lat") || n.includes("deadlift") || n.includes("spate") || n.includes("chin") || n.includes("shrug")) {
    return "Spate (Back)";
  }
  if (n.includes("overhead") || n.includes("military") || n.includes("shoulder") || n.includes("umeri") || n.includes("lateral") || n.includes("arnold") || n.includes("face-pull") || n.includes("delt")) {
    return "Umeri (Shoulders)";
  }
  if (n.includes("curl") || n.includes("biceps") || n.includes("triceps") || n.includes("skull") || n.includes("pushdown") || n.includes("katana") || n.includes("kickback") || n.includes("jm")) {
    return "Brațe (Biceps & Triceps)";
  }
  if (n.includes("squat") || n.includes("leg") || n.includes("lunge") || n.includes("calf") || n.includes("genuflex") || n.includes("presa") || n.includes("adduct") || n.includes("aductor") || n.includes("hamstring") || n.includes("glute") || n.includes("thrust") || n.includes("tibialis")) {
    return "Picioare (Quads & Hams)";
  }
  if (/\babs?\b/.test(n) || n.includes("abdom") || n.includes("crunch") || n.includes("plank") || n.includes("core") || n.includes("woodchopper")) {
    return "Abdomen & Core";
  }
  return "Spate (Back)";
}

// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------

export const AiCoachView: React.FC<AiCoachViewProps> = ({ workouts, onUpgradeClick }) => {
  // Navigation tabs inside AI Coach
  const [activeTab, setActiveTab] = useState<"readiness" | "stagnation" | "assistant">("readiness");

  // Gemini Live AI State & Conversation History
  const [aiLoading, setAiLoading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const stored = loadChatMessages();
    if (stored.length > 0) return stored;
    return [
      {
        id: "welcome-init",
        role: "assistant",
        text: "Salut! Sunt AI Expert în FitTrack Pro, specializat în biomecanică, deblocarea stagnărilor, deload-uri și optimizarea nutriției.\n\nÎntreabă-mă orice: de la dureri articulare (umeri, genunchi, spate), la depășirea platourilor sau ajustarea volumului de antrenament!",
        timestamp: new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  const [questionLoading, setQuestionLoading] = useState(false);

  useEffect(() => {
    saveChatMessages(chatMessages);
  }, [chatMessages]);

  const flatSessions = useMemo(() => extractAllSessions(workouts), [workouts]);

  // 1. CNS Readiness & Recovery Score Calculation
  const cnsMetrics = useMemo(() => {
    if (flatSessions.length === 0) {
      return {
        score: 100,
        status: "SNC Complet Refăcut",
        subStatus: "Nivel de energie optim. Gata pentru primul antrenament.",
        fatigueLevel: "Scăzut",
        weeklySessions: 0,
        weeklySets: 0,
        avgRpe: 8.0,
        hoursSinceLast: 999,
        actionAdvice: "Începe cu o sesiune de forță compusă (Squat, Bench sau Deadlift) la intensitate moderată (RPE 7–8).",
      };
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentSessions = flatSessions.filter((s) => s.timestamp >= sevenDaysAgo);

    const lastSession = flatSessions[flatSessions.length - 1];
    const hoursSinceLast = Math.max(0, Math.floor((now - lastSession.timestamp) / (60 * 60 * 1000)));

    let weeklySets = 0;
    let rpeSum = 0;
    let rpeCount = 0;

    recentSessions.forEach((session) => {
      session.entries.forEach((e) => {
        const validSets = e.sets.filter((s) => s.completed || s.weight > 0 || s.reps > 0);
        weeklySets += validSets.length;
        validSets.forEach((s) => {
          if (s.rpe && s.rpe >= 6 && s.rpe <= 10) {
            rpeSum += s.rpe;
            rpeCount++;
          }
        });
      });
    });

    const avgRpe = rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : 8.0;
    const weeklySessions = recentSessions.length;

    // Fatigue formula
    let fatigue = (weeklySets * 0.75) + (weeklySessions * 3.5);
    if (avgRpe >= 8.8) fatigue *= 1.3;
    else if (avgRpe >= 8.3) fatigue *= 1.15;
    else if (avgRpe < 7.5) fatigue *= 0.85;

    // Decay recovery bonus based on hours since last workout
    if (hoursSinceLast < 18) {
      fatigue += 12; // Very recent session
    } else if (hoursSinceLast >= 72) {
      fatigue -= 28; // 3+ days rest
    } else if (hoursSinceLast >= 48) {
      fatigue -= 18; // 2 days rest
    }

    const score = Math.max(20, Math.min(100, Math.round(100 - fatigue)));

    let status = "SNC 100% Refăcut • Pregătit de PR";
    let subStatus = "Capacitate neuromusculară maximă. Moment optim pentru intensitate ridicată.";
    let fatigueLevel = "Scăzut";
    let actionAdvice = "Sistemul nervos este complet regenerat. Vizează un nou record personal de forță sau greutate crescută la primul exercițiu compus (RPE 8.5–9).";

    if (score < 45) {
      status = "Risc de Supraantrenament";
      subStatus = "Oboseală acumulată masivă. Sistemul nervos central necesită repaus.";
      fatigueLevel = "Ridicată";
      actionAdvice = "Recomandat: 24-48h de pauză completă sau o sesiune ușoară de mobilitate / deload cu volum redus la jumătate.";
    } else if (score < 65) {
      status = "Oboseală Neuromusculară Moderată";
      subStatus = "Volumul săptămânal este ridicat. Păstrează rezerve de repetări.";
      fatigueLevel = "Moderat";
      actionAdvice = "Limitează efortul la RPE 7.5–8. Nu lucra până la eșec muscular absolut pe mișcările compuse.";
    } else if (score < 82) {
      status = "Capacitate Optimă de Efort";
      subStatus = "Nivel bun de refacere. Sesiune standard de hipertrofie.";
      fatigueLevel = "Scăzut";
      actionAdvice = "Efectuează volumul planificat în ritm constant, acordând 2-3 minute pauză între seriile grele.";
    }

    return {
      score,
      status,
      subStatus,
      fatigueLevel,
      weeklySessions,
      weeklySets,
      avgRpe,
      hoursSinceLast,
      actionAdvice,
    };
  }, [flatSessions]);

  // Session the stagnation analysis refers to: the latest day that is not in the future.
  const currentSession = useMemo(() => {
    const today = toLocalDayKey(Date.now());
    const pastSessions = flatSessions.filter((s) => s.dayKey <= today);
    if (pastSessions.length === 0) return null;

    const referenceDayKey = pastSessions.reduce(
      (latest, s) => (s.dayKey > latest ? s.dayKey : latest),
      pastSessions[0].dayKey
    );
    const sameDay = pastSessions.filter((s) => s.dayKey === referenceDayKey);
    return {
      dayKey: referenceDayKey,
      isToday: referenceDayKey === today,
      label: [...new Set(sameDay.map((s) => s.title))].join(" + "),
      exerciseNames: sameDay.flatMap((s) => s.entries.map((e) => e.name.trim())),
    };
  }, [flatSessions]);

  // 2. Real Stagnation Detection & Actionable Solution Generator
  const stagnationData = useMemo(() => {
    // One data point per exercise per calendar day, so same-day edits can never
    // pose as "sessions" when checking whether performance has plateaued.
    const exerciseDays = new Map<string, Map<string, ExerciseDayPoint>>();

    const todayKey = toLocalDayKey(Date.now());
    flatSessions.forEach((session) => {
      if (session.dayKey > todayKey) return;
      session.entries.forEach((e) => {
        const cleanName = e.name.trim();
        const validSets = e.sets.filter((s) => s.completed || s.weight > 0 || s.reps > 0);
        if (validSets.length === 0) return;

        let bestW = 0;
        let bestR = 0;
        let vol = 0;

        validSets.forEach((s) => {
          const w = s.weight || 0;
          const r = s.reps || 0;
          vol += w * r;
          if (w > bestW || (w === bestW && r > bestR)) {
            bestW = w;
            bestR = r;
          }
        });

        const days = exerciseDays.get(cleanName) ?? new Map<string, ExerciseDayPoint>();
        days.set(session.dayKey, {
          date: session.date,
          bestWeight: bestW,
          bestReps: bestR,
          sessionVolume: vol,
        });
        exerciseDays.set(cleanName, days);
      });
    });

    const exerciseHistory = new Map<string, ExerciseDayPoint[]>();
    exerciseDays.forEach((days, name) => exerciseHistory.set(name, [...days.values()]));

    const stagnantExercises: {
      exerciseName: string;
      plateauWeight: number;
      plateauReps: number;
      sessionsCount: number;
      isCompound: boolean;
      diagnostic: string;
      solutions: { title: string; desc: string; badge: string }[];
    }[] = [];

    exerciseHistory.forEach((history, exerciseName) => {
      if (history.length >= 3) {
        const last3 = history.slice(-3); // [s1, s2, s3]
        const s1 = last3[0];
        const s2 = last3[1];
        const s3 = last3[2];

        // Check if performance has not progressed over the 3 sessions
        const hasImproved = 
          s3.bestWeight > s2.bestWeight ||
          (s3.bestWeight === s2.bestWeight && s3.bestReps > s2.bestReps) ||
          s2.bestWeight > s1.bestWeight ||
          (s2.bestWeight === s1.bestWeight && s2.bestReps > s1.bestReps);

        if (!hasImproved) {
          const isCompound = /bench|press|squat|deadlift|row|pull-up|dip|genuflex/i.test(exerciseName);
          const deloadWeight = Math.round(s3.bestWeight * 0.9);

          const solutions = isCompound
            ? [
                {
                  title: "Micro-Loading (+1.25 kg)",
                  desc: "SNC s-a adaptat la treptele mari de greutate. Adaugă cele mai mici discuri (1.25 kg pe parte) pentru a forța o nouă adaptare neuronală.",
                  badge: "Recomandat",
                },
                {
                  title: `Deload Strategic la ${deloadWeight} kg`,
                  desc: `Redu încărcarea cu 10% (la ${deloadWeight} kg) și adaugă 2 serii de volum în intervalul 8-10 repetări timp de 2 săptămâni.`,
                  badge: "Acumulare Volum",
                },
                {
                  title: "Schimbare Tempou Excentric",
                  desc: "Menține greutatea actuală, dar aplică o coborâre controlată de 3 secunde pe repetare pentru a spori tensiunea mecanică.",
                  badge: "Stimul Nou",
                },
              ]
            : [
                {
                  title: "Schimbare Interval Repetări (12–15 reps)",
                  desc: "Pentru exercițiile de izolare, trecerea la 12-15 repetări stimulează recrutarea fibrelor fără a supraîncărca tendoanele.",
                  badge: "Hipertrofie",
                },
                {
                  title: "Variație Unghi Mecanic",
                  desc: "Înlocuiește mișcarea cu o variantă la scripete sau gantere pentru a modifica profilul de rezistență în punctul de contracție maximă.",
                  badge: "Variație",
                },
                {
                  title: "Drop-Set la Ultima Serie",
                  desc: "După ultimul set cu greutatea obișnuită, scade 25% și pompează până la epuizare fără pauză.",
                  badge: "Intensitate",
                },
              ];

          stagnantExercises.push({
            exerciseName,
            plateauWeight: s3.bestWeight,
            plateauReps: s3.bestReps,
            sessionsCount: history.length,
            isCompound,
            diagnostic: `Greutate plafonată la ${s3.bestWeight} kg (${s3.bestReps} reps) pe parcursul ultimelor 3 sesiuni.`,
            solutions,
          });
        }
      }
    });

    // Only report plateaus for what was trained in the current session: today's, or the last finished one.
    // A workout scheduled for a future day must never be analysed.
    if (!currentSession) return [];
    const currentExerciseNames = new Set(currentSession.exerciseNames);
    return stagnantExercises.filter((st) => currentExerciseNames.has(st.exerciseName));
  }, [flatSessions, currentSession]);

  // Run Live Gemini Analysis
  const handleRunAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const analysis = await analyzeWorkoutVolume(workouts);
      const newMsg: ChatMessage = {
        id: `analysis-${Date.now()}`,
        role: "assistant",
        text: formatAnalysisSummary(analysis),
        timestamp: new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, newMsg]);
    } catch (e) {
      console.error(e);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          text: getAiErrorMessage(e),
          timestamp: new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Handle Ask AI Coach
  const handleAskQuestion = async (queryText?: string) => {
    const q = (queryText || customQuestion).trim();
    if (!q) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!queryText) setCustomQuestion("");
    setQuestionLoading(true);

    try {
      const answer = await askAiCoachQuestion(q, workouts);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: answer,
        timestamp: new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error(e);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          text: getAiErrorMessage(e),
          timestamp: new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setQuestionLoading(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    const resetMsg: ChatMessage = {
      id: "init-reset",
      role: "assistant",
      text: "Conversația a fost resetată. Cu ce problemă sau întrebare te pot ajuta astăzi (dureri, stagnare, selecție exerciții, deload sau nutriție)?",
      timestamp: new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages([resetMsg]);
  };

  const hasWorkouts = workouts.length > 0;

  return (
    <div className="space-y-6 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-500 select-none">
      {/* Top Sticky Header */}
      <header className="pt-2 pb-4 px-6 sticky top-[env(safe-area-inset-top)] bg-[#f4f7f0] dark:bg-[#000000] z-20 -mx-4 transition-all flex justify-between items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-black tracking-tighter text-slate-950 dark:text-zinc-50 uppercase leading-none">
            AI COACH
          </h1>
          <p className="text-blue-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] min-[400px]:tracking-[0.3em] sm:tracking-[0.4em] mt-1.5 leading-snug break-words">
            Sports Science & Readiness Engine
          </p>
        </div>

        <button
          onClick={handleRunAiAnalysis}
          disabled={aiLoading || !hasWorkouts}
          className="shrink-0 p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-blue-600 dark:text-orange-500 cursor-pointer disabled:opacity-40 shadow-xs active:scale-95 transition-transform flex items-center gap-1.5"
          title="Reanalizează cu Gemini 3.8 Flash"
        >
          <RefreshCw className={cn("size-4", aiLoading && "animate-spin")} />
          <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Analiză Live</span>
        </button>
      </header>

      <ProGuard feature="ai_coach" onUpgradeClick={onUpgradeClick}>
        {hasWorkouts ? (
          <div className="space-y-5 px-1">
            {/* Quick Segmented Menu Filter (3 Clean Tabs) */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/70 dark:bg-zinc-900/90 rounded-2xl border border-slate-200 dark:border-white/5 text-[9px] min-[400px]:text-[10px] font-black uppercase tracking-wide sm:tracking-wider">
              <button
                onClick={() => setActiveTab("readiness")}
                className={cn(
                  "min-w-0 px-1 py-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                  activeTab === "readiness"
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-orange-500 shadow-xs"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Zap className="size-3.5" />
                <span className="text-center leading-tight">SNC & Refacere</span>
              </button>

              <button
                onClick={() => setActiveTab("stagnation")}
                className={cn(
                  "min-w-0 px-1 py-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 relative",
                  activeTab === "stagnation"
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-orange-500 shadow-xs"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <AlertTriangle className="size-3.5" />
                <span className="text-center leading-tight">Stagnări ({stagnationData.length})</span>
                {stagnationData.length > 0 && (
                  <span className="absolute top-1 right-2 size-2 bg-amber-500 rounded-full" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("assistant")}
                className={cn(
                  "min-w-0 px-1 py-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                  activeTab === "assistant"
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-orange-500 shadow-xs"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Brain className="size-3.5" />
                <span className="text-center leading-tight">AI Expert</span>
              </button>
            </div>

            {/* TAB 1: READINESS & NERVOUS SYSTEM RECOVERY */}
            {activeTab === "readiness" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Hero Readiness Gauge Card */}
                <div className="p-5 sm:p-8 bg-white dark:bg-[#141414] border border-slate-200/60 dark:border-white/5 rounded-[2rem] sm:rounded-[2.5rem] shadow-xs relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6">
                    <div className="min-w-0">
                      <div className="flex items-start gap-2 mb-1.5">
                        <Zap className="size-4 shrink-0 mt-px text-blue-600 dark:text-orange-500" />
                        <span className="min-w-0 text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] leading-snug text-blue-600 dark:text-orange-500">
                          Scor Pregătire & Sistem Nervos Central
                        </span>
                      </div>
                      <h3 className="text-xl min-[400px]:text-2xl sm:text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight break-words">
                        {cnsMetrics.status}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md font-medium leading-relaxed">
                        {cnsMetrics.subStatus}
                      </p>
                    </div>

                    {/* Circular Battery / Gauge */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="relative size-24 rounded-3xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center shadow-inner">
                        <span className={cn(
                          "text-4xl font-black tracking-tighter leading-none",
                          cnsMetrics.score >= 80 ? "text-emerald-500" : cnsMetrics.score >= 60 ? "text-amber-500" : "text-rose-500"
                        )}>
                          {cnsMetrics.score}
                        </span>
                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest mt-1">/ 100</span>
                      </div>
                    </div>
                  </div>

                  {/* Readiness Progress Line */}
                  <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden mt-6">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        cnsMetrics.score >= 80 ? "bg-emerald-500" : cnsMetrics.score >= 60 ? "bg-amber-500" : "bg-rose-500"
                      )}
                      style={{ width: `${cnsMetrics.score}%` }}
                    />
                  </div>

                  {/* Sub-Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mt-6 pt-6 border-t border-slate-100 dark:border-white/5">
                    <div className="min-w-0 p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block break-words">Frecvență 7 Zile</span>
                      <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 break-words">{cnsMetrics.weeklySessions} sesiuni</p>
                    </div>

                    <div className="min-w-0 p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block break-words">Volum Total</span>
                      <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 break-words">{cnsMetrics.weeklySets} serii grele</p>
                    </div>

                    <div className="min-w-0 p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block break-words">Intensitate Medie</span>
                      <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 break-words">@RPE {cnsMetrics.avgRpe}</p>
                    </div>

                    <div className="min-w-0 p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block break-words">Timp Odihnă SNC</span>
                      <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 break-words">
                        {cnsMetrics.hoursSinceLast < 999 ? `~${cnsMetrics.hoursSinceLast} ore` : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Actionable Workout Focus */}
                  <div className="mt-5 p-4 rounded-2xl bg-blue-50/50 dark:bg-white/[0.02] border border-blue-100 dark:border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-orange-500 mb-1 flex items-start gap-1.5">
                      <Target className="size-3.5 shrink-0 mt-px" />
                      <span className="min-w-0">Plan Recomandat pentru Următorul Antrenament</span>
                    </p>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 leading-relaxed break-words">
                      {cnsMetrics.actionAdvice}
                    </p>
                  </div>
                </div>

                {/* Progressive Overload Standards Card */}
                <div className="p-5 sm:p-7 bg-white dark:bg-[#141414] border border-slate-200/60 dark:border-white/5 rounded-[2rem] sm:rounded-[2.5rem] shadow-xs space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] leading-snug break-words text-slate-400 dark:text-zinc-500">
                    Reguli de Aur pentru Hipertrofie & Progres
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {PROGRESSIVE_OVERLOAD_PRINCIPLES.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex flex-col justify-between"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">
                            {p.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">
                            {p.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: STAGNATION DETECTION & SOLUTIONS */}
            {activeTab === "stagnation" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-5 sm:p-7 bg-white dark:bg-[#141414] border border-slate-200/60 dark:border-white/5 rounded-[2rem] sm:rounded-[2.5rem] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={cn("size-4 shrink-0 mt-px", stagnationData.length > 0 ? "text-amber-500" : "text-emerald-500")} />
                        <h3 className="min-w-0 font-black text-base sm:text-lg text-slate-950 dark:text-white uppercase tracking-tight leading-tight break-words">
                          Detecție Stagnare & Soluții Inteligente
                        </h3>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider sm:tracking-widest mt-1.5 leading-snug break-words">
                        Algoritmul analizează sesiunile identice din istoricul tău
                      </p>
                      {currentSession && (
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-1 leading-snug break-words">
                          Analizat pe {currentSession.isToday ? "sesiunea de azi" : "ultima sesiune"}: {currentSession.label} ·{" "}
                          {formatWeekdayDate(currentSession.dayKey)}
                        </p>
                      )}
                    </div>
                  </div>

                  {stagnationData.length > 0 ? (
                    <div className="space-y-4 pt-1">
                      {stagnationData.map((st, idx) => (
                        <div
                          key={idx}
                          className="p-4 sm:p-5 rounded-3xl bg-amber-50/40 dark:bg-amber-500/[0.04] border border-amber-200/60 dark:border-amber-500/20 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <span className="inline-block max-w-full text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 leading-snug">
                                Plafonare Detectată (3+ sesiuni)
                              </span>
                              <h4 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-tight mt-1.5 break-words leading-tight">
                                {st.exerciseName}
                              </h4>
                              <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium mt-0.5 break-words">
                                {st.diagnostic}
                              </p>
                            </div>

                            <div className="text-right shrink-0 max-w-[40%]">
                              <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                                {st.plateauWeight} kg
                              </span>
                              <span className="text-xs font-bold text-slate-500 block">
                                × {st.plateauReps} reps
                              </span>
                            </div>
                          </div>

                          {/* Actionable Solutions */}
                          <div className="pt-2 border-t border-amber-200/50 dark:border-amber-500/10 space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 block">
                              Soluții Științifice de Deblocare:
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {st.solutions.map((sol, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-amber-200/40 dark:border-white/5 space-y-1"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="min-w-0 text-xs font-black text-slate-900 dark:text-white break-words">
                                      {sol.title}
                                    </span>
                                    <span className="shrink-0 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                      {sol.badge}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                                    {sol.desc}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-3xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-200/60 dark:border-emerald-500/10 flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0">
                        <CheckCircle2 className="size-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                          Nicio Stagnare Detectată!
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium mt-0.5 leading-relaxed">
                          Toate exercițiile urmărite din jurnal au înregistrat progres de greutate sau repetări în ultimele 3 sesiuni, respectând principiul Double Progression.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: UNIVERSAL FITNESS & BIOMECHANICS AI EXPERT */}
            {activeTab === "assistant" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-5 sm:p-7 bg-white dark:bg-[#141414] border border-slate-200/60 dark:border-white/5 rounded-[2rem] sm:rounded-[2.5rem] shadow-xs space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-start gap-2">
                        <Brain className="size-4 shrink-0 mt-px text-purple-600 dark:text-purple-400" />
                        <h3 className="min-w-0 font-black text-base sm:text-lg text-slate-950 dark:text-white uppercase tracking-tight leading-tight break-words">
                          AI Expert • Problem Solver Universal
                        </h3>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider sm:tracking-widest mt-1.5 leading-snug break-words">
                        Powered by Gemini 3.8 Flash • Rezolvă orice problemă de biomecanică, dureri, stagnare & nutriție
                      </p>
                    </div>

                    <button
                      onClick={handleClearChat}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                      title="Resetează conversația"
                      aria-label="Șterge istoricul chat"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  {/* Problem Solver Categories Filter */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                      Alege Categoria Problemei Tale:
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar scroll-fade-x touch-pan-x">
                      {[
                        { id: "all", label: "Toate" },
                        { id: "pain", label: "Dureri & Articulații" },
                        { id: "plateau", label: "Stagnare & Platou" },
                        { id: "deload", label: "Deload & SNC" },
                        { id: "swaps", label: "Înlocuire Exerciții" },
                        { id: "nutrition", label: "Nutriție & Slăbire" },
                        { id: "hypertrophy", label: "Hipertrofie & Volum" },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategory(cat.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer",
                            activeCategory === cat.id
                              ? "bg-purple-600 text-white shadow-xs"
                              : "bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                      <span aria-hidden="true" className="w-8 h-px shrink-0 sm:hidden" />
                    </div>
                  </div>

                  {/* Contextual Quick Prompts based on Active Category */}
                  <div className="flex flex-wrap gap-2">
                    {(
                      activeCategory === "pain"
                        ? [
                            "Mă dor umerii la Bench Press - ce ajustez în execuție?",
                            "Simt tensiune lombară la Deadlift / îndreptări",
                            "Disconfort la genunchi în adâncimea genuflexiunii",
                            "Cum protejez coatele la extensiile pentru triceps?",
                          ]
                        : activeCategory === "plateau"
                        ? [
                            "Cum deblochez greutatea la Bench Press dacă stagnez?",
                            "Nu mai pot crește repetările la tracțiuni - ce fac?",
                            "Cum funcționează metoda Back-Off Set?",
                            "Ce este Double Progression și cum o aplic corect?",
                          ]
                        : activeCategory === "deload"
                        ? [
                            "Când este momentul potrivit pentru o săptămână de Deload?",
                            "Cum programez săptămâna de deload fără să pierd masă?",
                            "Semne clare că sistemul nervos central (SNC) este epuizat",
                          ]
                        : activeCategory === "swaps"
                        ? [
                            "Cu ce pot înlocui genuflexiunile dacă nu am suport de bară?",
                            "Alternative eficiente la tracțiuni dacă mă antrenez acasă",
                            "Cel mai bun înlocuitor pentru împinsul militar de la umeri",
                          ]
                        : activeCategory === "nutrition"
                        ? [
                            "Câte grame de proteine pe kg corp am nevoie la definire?",
                            "Cum calculez un deficit caloric optim fără pierdere de forță?",
                            "Când și cum se administrează optim creatina monohidrat?",
                          ]
                        : activeCategory === "hypertrophy"
                        ? [
                            "Câte seturi directe pe săptămână sunt optime pentru brațe?",
                            "Ce frecvență săptămânală este ideală pentru masa spatelui?",
                            "Cum optimizez supraîncărcarea progresivă la izolari?",
                          ]
                        : [
                            "Mă dor umerii la Bench Press - cum corectez poziția?",
                            "Cum deblochez stagnarea la primul exercițiu compus?",
                            "Când este momentul potrivit pentru un Deload?",
                            "Cum optimizez proteinele și caloriile pentru masă musculară?",
                          ]
                    ).map((chipText, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => handleAskQuestion(chipText)}
                        disabled={questionLoading}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-medium cursor-pointer transition-colors text-left border border-slate-200/60 dark:border-white/5 active:scale-95"
                      >
                        {chipText}
                      </button>
                    ))}
                  </div>

                  {/* Multi-turn Chat Conversation History Stream */}
                  <div className="space-y-3 pt-2 max-h-[460px] overflow-y-auto pr-1">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "space-y-1.5",
                          msg.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start"
                        )}
                      >
                        {msg.role === "user" ? (
                          <div className="max-w-[85%] p-3.5 rounded-2xl rounded-tr-sm bg-purple-600 text-white text-xs font-semibold shadow-xs">
                            <p>{msg.text}</p>
                            <span className="text-[9px] text-purple-200 mt-1 block text-right">
                              {msg.timestamp}
                            </span>
                          </div>
                        ) : (
                          <div className="w-full p-5 rounded-2xl rounded-tl-sm bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-500/20 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                                <Sparkles className="size-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-wider">
                                  AI Expert Sports Scientist
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-medium text-slate-400 dark:text-zinc-500">
                                  {msg.timestamp}
                                </span>
                                <button
                                  onClick={() => handleCopyText(msg.text, msg.id)}
                                  className="p-1 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400 transition-colors cursor-pointer"
                                  title="Copiază recomandarea"
                                >
                                  {copiedId === msg.id ? (
                                    <Check className="size-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="size-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="text-xs text-slate-800 dark:text-zinc-200 font-medium leading-relaxed whitespace-pre-line space-y-2">
                              {msg.text}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Loading State Pulse */}
                    {questionLoading && (
                      <div className="w-full p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-500/20 animate-pulse space-y-2.5">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="size-3.5 text-purple-500 animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                            AI Expert analizează istoricul și elaborează soluția științifică...
                          </span>
                        </div>
                        <div className="h-3.5 w-full bg-purple-200/60 dark:bg-purple-900/40 rounded-full" />
                        <div className="h-3.5 w-5/6 bg-purple-200/60 dark:bg-purple-900/40 rounded-full" />
                        <div className="h-3.5 w-2/3 bg-purple-200/60 dark:bg-purple-900/40 rounded-full" />
                      </div>
                    )}
                  </div>

                  {/* Custom Question Input */}
                  <div className="relative pt-2">
                    <input
                      type="text"
                      placeholder="Descrie orice problemă (dureri, stagnare, înlocuire exercițiu, deload, nutriție)..."
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAskQuestion();
                      }}
                      className="w-full bg-slate-100 dark:bg-black/50 border border-slate-200/80 dark:border-white/10 rounded-2xl pl-4 pr-12 py-3.5 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <button
                      onClick={() => handleAskQuestion()}
                      disabled={questionLoading || !customQuestion.trim()}
                      className="absolute right-2 top-[15px] p-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 cursor-pointer active:scale-95 transition-all"
                      aria-label="Trimite întrebarea către AI Expert"
                    >
                      <Send className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-24 bg-white dark:bg-[#141414] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center mx-1">
            <Activity className="size-12 text-slate-300 dark:text-zinc-700 mb-4" />
            <h4 className="font-black text-lg text-slate-900 dark:text-white uppercase mb-2">
              Lipsește Istoricul de Antrenament
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mb-6">
              Înregistrează cel puțin 1 antrenament în Jurnal pentru a debloca analiza automată de recuperare SNC, detecția stagnărilor și recomandările AI.
            </p>
          </div>
        )}
      </ProGuard>
    </div>
  );
};
