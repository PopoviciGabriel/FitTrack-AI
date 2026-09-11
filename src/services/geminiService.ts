import { GoogleGenAI } from "@google/genai";
import { Workout, AiVolumeAnalysis, MuscleGroupVolume } from "../types";

let genAI: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "" || apiKey === "undefined") {
      return null;
    }
    if (!genAI) {
      genAI = new GoogleGenAI({ apiKey });
    }
    return genAI;
  } catch (error) {
    console.warn("AI initialization note:", error);
    return null;
  }
}

const SYSTEM_INSTRUCTION = `Ești un Senior Sports Scientist, Antrenor de Elită și Biomecanic specializat în hipertrofie musculară, periodizare și Progressive Overload (supraîncărcare progresivă).
Analizezi jurnalele de antrenament și returnezi exclusiv un răspuns JSON valid conform structurii cerute.
Principiile tale:
1. Volum optim per grupă musculară: 10-20 seturi eficiente pe săptămână (RP Strength / Eric Helms / Brad Schoenfeld standards).
2. Sub-antrenat: sub 8-10 seturi/săptămână. Supra-antrenat / junk volume: peste 22 seturi/săptămână.
3. Progressive Overload specific: creștere de 1.25kg - 2.5kg la mișcări compuse sau creșterea repetărilor (double progression).
4. Recomandările tale sunt precise, practice și în limba română.`;

/**
 * Heuristic fallback engine calculating exact biomechanics and volume metrics
 * when offline or without an active API key.
 */
function calculateFallbackAnalysis(workouts: Workout[]): AiVolumeAnalysis {
  const muscleSets: Record<string, number> = {
    "Piept (Chest)": 0,
    "Spate (Back)": 0,
    "Umeri (Shoulders)": 0,
    "Brațe (Biceps & Triceps)": 0,
    "Picioare (Quads & Hams)": 0,
    "Abdomen & Core": 0,
  };

  let totalSets = 0;
  let totalVolumeKg = 0;
  const exerciseWeights: Record<string, number[]> = {};

  // Check past 14-28 days workouts
  const recentWorkouts = workouts.slice(0, 10);

  recentWorkouts.forEach((w) => {
    w.entries.forEach((entry) => {
      const name = entry.name.toLowerCase();
      let category = "Spate (Back)";

      if (name.includes("bench") || name.includes("chest") || name.includes("piept") || name.includes("fly") || name.includes("push-up") || name.includes("dip")) {
        category = "Piept (Chest)";
      } else if (name.includes("row") || name.includes("pull") || name.includes("lat") || name.includes("deadlift") || name.includes("spate")) {
        category = "Spate (Back)";
      } else if (name.includes("press") && (name.includes("shoulder") || name.includes("overhead") || name.includes("military") || name.includes("lateral") || name.includes("umeri"))) {
        category = "Umeri (Shoulders)";
      } else if (name.includes("curl") || name.includes("biceps") || name.includes("triceps") || name.includes("skull") || name.includes("pushdown")) {
        category = "Brațe (Biceps & Triceps)";
      } else if (name.includes("squat") || name.includes("leg") || name.includes("lunge") || name.includes("calf") || name.includes("genuflex") || name.includes("presa")) {
        category = "Picioare (Quads & Hams)";
      } else if (name.includes("ab") || name.includes("crunch") || name.includes("plank") || name.includes("core")) {
        category = "Abdomen & Core";
      }

      const completedSets = entry.sets.filter((s) => s.completed || s.weight > 0);
      const setCount = completedSets.length > 0 ? completedSets.length : entry.sets.length;
      muscleSets[category] = (muscleSets[category] || 0) + setCount;
      totalSets += setCount;

      entry.sets.forEach((s) => {
        totalVolumeKg += (s.weight || 0) * (s.reps || 0);
        if (s.weight > 0) {
          if (!exerciseWeights[entry.name]) exerciseWeights[entry.name] = [];
          exerciseWeights[entry.name].push(s.weight);
        }
      });
    });
  });

  // Calculate muscle group statuses
  const muscleVolumes: MuscleGroupVolume[] = Object.entries(muscleSets).map(([cat, sets]) => {
    let status: "sub-antrenat" | "optim" | "supra-antrenat" = "optim";
    if (sets < 8) status = "sub-antrenat";
    else if (sets > 22) status = "supra-antrenat";

    return {
      category: cat,
      directSets: sets,
      status,
      recommendedSetsRange: "10-18 seturi/săpt",
    };
  });

  // Find stagnant exercises
  const stagnant: { name: string; suggestion: string }[] = [];
  Object.entries(exerciseWeights).forEach(([exName, weights]) => {
    if (weights.length >= 3) {
      const last3 = weights.slice(-3);
      if (last3[0] === last3[1] && last3[1] === last3[2]) {
        stagnant.push({
          name: exName,
          suggestion: `Greutatea stagnează la ${last3[0]}kg. Aplică micro-loading (+1.25kg sau +2.5kg) ori crește cu 2 repetări înainte de creșterea greutății.`,
        });
      }
    }
  });

  // Compute fatigue & recovery score
  let recoveryScore = 85;
  if (totalSets > 50) recoveryScore = 62;
  if (totalSets > 70) recoveryScore = 48;
  if (recentWorkouts.length <= 2) recoveryScore = 95;

  let recoveryStatus: "Excelentă" | "Bună" | "Risc de OBOSEALĂ" | "Supraantrenament" = "Excelentă";
  let fatigueLevel: "Scăzut" | "Moderat" | "Ridicată" = "Scăzut";

  if (recoveryScore < 50) {
    recoveryStatus = "Supraantrenament";
    fatigueLevel = "Ridicată";
  } else if (recoveryScore < 70) {
    recoveryStatus = "Risc de OBOSEALĂ";
    fatigueLevel = "Moderat";
  } else if (recoveryScore < 85) {
    recoveryStatus = "Bună";
    fatigueLevel = "Scăzut";
  }

  const tips = [
    "Prioritizează principiul Double Progression: dacă atingi limita maximă de repetări pe toate seriile (ex: 3x10), adaugă 2.5 kg.",
    "Păstrează RPE 8-9 (1-2 repetări în rezervă) pe exercițiile grele compuse pentru a proteja sistemul nervos central.",
    "Asigură-te că dormi 7-9 ore și ai cel puțin 1.8g - 2.2g de proteine / kg corp pentru sinteza optimă a proteinelor musculare.",
  ];

  const nextWorkoutFocus =
    recentWorkouts.length > 0
      ? `Concentrează-te pe supraîncărcarea progresivă la mișcarea principală (${recentWorkouts[0].entries[0]?.name || "Bench Press"}). Încearcă +2.5 kg sau +1 rep per serie.`
      : "Începe cu o sesiune de forță compusă (Squat / Bench / Deadlift) la RPE 7-8.";

  return {
    recoveryScore,
    recoveryStatus,
    fatigueLevel,
    muscleVolumes,
    stagnantExercises:
      stagnant.length > 0
        ? stagnant.slice(0, 3)
        : [
            {
              name: "Exerciții Compuse Generale",
              suggestion: "Progres stabil. Dacă atingi topul intervalului de repetări (ex: 8-10 reps), mărește greutatea cu 2.5kg.",
            },
          ],
    progressiveOverloadTips: tips,
    nextWorkoutFocus,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * High-level AI Volume and Progressive Overload Analyzer
 */
export async function analyzeWorkoutVolume(workouts: Workout[]): Promise<AiVolumeAnalysis> {
  const fallback = calculateFallbackAnalysis(workouts);

  try {
    const ai = getAI();
    if (!ai) {
      return fallback;
    }

    // Build concise workout summary for the prompt
    const summary = workouts.slice(0, 8).map((w) => ({
      date: w.date,
      title: w.title,
      exercises: w.entries.map((e) => ({
        name: e.name,
        setsCount: e.sets.length,
        loads: e.sets.map((s) => `${s.weight}kg x ${s.reps}reps (RPE: ${s.rpe || 8})`).join(", "),
      })),
    }));

    const prompt = `Analizează istoricul acestor antrenamente:\n${JSON.stringify(summary, null, 2)}\n
Generează o analiză completă de hipertrofie și supraîncărcare progresivă în format JSON cu exact cheile:
{
  "recoveryScore": number (0-100),
  "recoveryStatus": "Excelentă" | "Bună" | "Risc de OBOSEALĂ" | "Supraantrenament",
  "fatigueLevel": "Scăzut" | "Moderat" | "Ridicată",
  "muscleVolumes": [
    {
      "category": string,
      "directSets": number,
      "status": "sub-antrenat" | "optim" | "supra-antrenat",
      "recommendedSetsRange": string
    }
  ],
  "stagnantExercises": [
    { "name": string, "suggestion": string }
  ],
  "progressiveOverloadTips": [string, string, string],
  "nextWorkoutFocus": string
}
Răspunde exclusiv cu JSON brut, fără markdown backticks.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      },
    });

    clearTimeout(timeout);

    const text = response.text?.trim() || "";
    const cleaned = text.replace(/^```json\n?/, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      recoveryScore: typeof parsed.recoveryScore === "number" ? parsed.recoveryScore : fallback.recoveryScore,
      recoveryStatus: parsed.recoveryStatus || fallback.recoveryStatus,
      fatigueLevel: parsed.fatigueLevel || fallback.fatigueLevel,
      muscleVolumes: Array.isArray(parsed.muscleVolumes) && parsed.muscleVolumes.length > 0 ? parsed.muscleVolumes : fallback.muscleVolumes,
      stagnantExercises: Array.isArray(parsed.stagnantExercises) ? parsed.stagnantExercises : fallback.stagnantExercises,
      progressiveOverloadTips: Array.isArray(parsed.progressiveOverloadTips) ? parsed.progressiveOverloadTips : fallback.progressiveOverloadTips,
      nextWorkoutFocus: parsed.nextWorkoutFocus || fallback.nextWorkoutFocus,
      analyzedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("Gemini Volume Analysis fallback activated:", err);
    return fallback;
  }
}

/**
 * Quick coach advice for home dashboard
 */
export async function getWorkoutAdvice(recentWorkouts: Workout[]): Promise<string> {
  try {
    const ai = getAI();
    if (!ai) {
      return "Fiecare repetare controlată apropie noul record. Menține ritmul și asigură-te că dormi suficient!";
    }

    const summary = recentWorkouts.map((w) => `${w.title} (${w.entries.length} exerciții)`).join("; ");
    const prompt = `Antrenamente recente: ${summary}. Dă un sfat tehnic concret de forță/hipertrofie în 2 fraze scurte, motivant, în limba română.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text?.trim() || "Continuă supraîncărcarea progresivă cu execuție strictă!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Concentrează-te pe tensiunea mecanică și adaugă 1-2 repetări per serie înainte de a mări greutatea.";
  }
}
