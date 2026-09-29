import { GoogleGenAI } from "@google/genai";
import { Workout, AiVolumeAnalysis, MuscleGroupVolume, AiMealSuggestion, MealSlotCategory } from "../types";

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
      } else if (name.includes("squat") || name.includes("leg") || name.includes("lunge") || name.includes("calf") || name.includes("genuflex") || name.includes("presa") || name.includes("adduct") || name.includes("aductor")) {
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
  const defaultAdvice = "Prioritatea următoare: crește greutatea cu 1-2.5 kg sau adaugă 1 repetare curată la primul exercițiu compus.";

  try {
    const ai = getAI();
    if (!ai) {
      if (recentWorkouts.length > 0) {
        const last = recentWorkouts[0];
        const mainExercise = last.entries[0]?.name;
        if (mainExercise) {
          return `La următoarea sesiune, vizează supraîncărcarea progresivă la ${mainExercise}: adaugă 1 repetare curată sau 1.25 kg pe bară.`;
        }
        return `La următoarea sesiune, mărește intensitatea la primul exercițiu compus din ${last.title}, păstrând forma strictă de execuție.`;
      }
      return defaultAdvice;
    }

    const summary = recentWorkouts.map((w) => `${w.title} (${w.entries.map(e => e.name).slice(0, 3).join(", ")})`).join("; ");
    const prompt = `Antrenamente recente ale utilizatorului: ${summary}.
Cerință: Oferă un REZUMAT DE ACȚIUNE COMPLET, important dar scurt, despre ceea ce trebuie să facă utilizatorul la următorul antrenament.

REGULI OBLIGATORII:
- Enunțul TREBUIE să fie COMPLET (o singură frază completă sau două propoziții scurte legate, fără idei neterminate).
- Conținut: Spune-i direct și clar ce trebuie să facă (ex: supraîncărcare progresivă la mișcarea principală, pauze optime sau volum pe grupa prioritară).
- Lungime: Scurt, important și la obiect (între 14 și 22 de cuvinte).
- Format: STRICT text simplu, FĂRĂ formatare JSON, FĂRĂ acolade, FĂRĂ markdown, FĂRĂ ghilimele.
- Limba: Română.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "Ești un antrenor de forță și hipertrofie de elită. Returnezi STRICT o recomandare completă și acționabilă în limba română (14-22 de cuvinte, text simplu), spunându-i utilizatorului direct ce are de făcut la următoarea sesiune. Niciodată nu folosi JSON, markdown, ghilimele sau fraze neterminate.",
      },
    });

    let raw = response.text?.trim() || "";

    // Robust parsing/cleaning if AI accidentally sent JSON or codeblocks
    if (raw.startsWith("{") && raw.endsWith("}")) {
      try {
        const parsed = JSON.parse(raw);
        raw = parsed.advice || parsed.tip || parsed.message || parsed.sfat || parsed.action || Object.values(parsed)[0] as string || raw;
      } catch {
        // ignore
      }
    }
    raw = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/[{}"`]/g, "")
      .trim();

    return raw || defaultAdvice;
  } catch (error) {
    console.error("Gemini Error:", error);
    return defaultAdvice;
  }
}

/**
 * Heuristic fallback meal generator for bodybuilding and hypertrophy
 */
function getFallbackMeal(query: string, category: MealSlotCategory): AiMealSuggestion {
  const q = query.toLowerCase();

  if (q.includes("ovaz") || q.includes("oat") || q.includes("mic dejun") || category === "mic_dejun") {
    return {
      name: "Bol Anabolic cu Fulgi de Ovăz, Whey & Fructe de Pădure",
      description: "Combinație clasică de carbohidrați complecși cu absorbție lentă și proteine rapide pentru sinteză proteică maximă dimineața.",
      category: "mic_dejun",
      calories: 520,
      protein: 48,
      carbs: 62,
      fats: 9,
      fiber: 8,
      prepTimeMin: 6,
      ingredients: [
        "80g Fulgi de ovăz fini",
        "35g Pudră proteică Whey Isolate",
        "15g Unt de arahide natural",
        "100g Fructe de pădure (afine / zmeură)",
        "200ml Apă fierbinte sau lapte degresat"
      ],
      instructions: [
        "Fierbe sau hidratează fulgii de ovăz cu apă caldă timp de 3 minute.",
        "Lasă să se răcească 1 minut, apoi adaugă pudra proteică și omogenizează bine.",
        "Decorează cu fructele de pădure și lingura de unt de arahide deasupra."
      ]
    };
  }

  if (q.includes("vita") || q.includes("cartof") || q.includes("cina") || category === "cina") {
    return {
      name: "Mușchi de Vită la Grătar cu Cartofi Dulci și Sparanghel",
      description: "Masă bogată în creatină naturală, fier hemic și carbohidrați cu indice glicemic moderat pentru refacerea glicogenului.",
      category: "cina",
      calories: 640,
      protein: 52,
      carbs: 58,
      fats: 18,
      fiber: 7,
      prepTimeMin: 22,
      ingredients: [
        "180g Mușchi slab de vită",
        "250g Cartofi dulci copți la cuptor",
        "120g Sparanghel verde sotat",
        "10g Ulei de măsline extra-virgin",
        "Sare de mare, piper negru măcinat și rozmarin"
      ],
      instructions: [
        "Condimentează carnea cu sare și piper; gătește-o la tigaie grill 3-4 minute pe fiecare parte.",
        "Coace cartofii dulci tăiați cuburi la 200°C cu puțin rozmarin și ulei de măsline.",
        "Sotează sparanghelul în tigaie pentru 5 minute până devine crocant."
      ]
    };
  }

  if (q.includes("shake") || q.includes("post") || category === "post_workout") {
    return {
      name: "Super-Shake Anabolic Post-Workout",
      description: "Fereastră metabolică optimizată cu proteine Whey cu absorbție rapidă și carbohidrați simpli pentru reîncărcare celulară.",
      category: "post_workout",
      calories: 460,
      protein: 44,
      carbs: 56,
      fats: 6,
      fiber: 4,
      prepTimeMin: 3,
      ingredients: [
        "40g Whey Isolate",
        "1 Banană coaptă medie",
        "30g Făină de ovăz / carbohidrați rapizi",
        "5g Creatină monohidrat",
        "300ml Apă rece sau lapte de migdale"
      ],
      instructions: [
        "Pune toate ingredientele în blender.",
        "Mizează 30-45 secunde la viteză mare până devine o băutură cremoasă.",
        "Consumă în primele 45 de minute după terminarea antrenamentului."
      ]
    };
  }

  // Default clean Bodybuilding meal
  return {
    name: "Bol de Culturism: Piept de Pui, Orez Basmati & Broccoli",
    description: "Standardul de aur în alimentația sportivă: digestie ușoară, profil de aminoacizi complet și densitate nutritivă curată.",
    category: category || "pranz",
    calories: 590,
    protein: 55,
    carbs: 68,
    fats: 10,
    fiber: 6,
    prepTimeMin: 18,
    ingredients: [
      "180g Piept de pui la grătar",
      "85g Orez Basmati (cântărit uscat)",
      "150g Broccoli fiert la abur",
      "10g Ulei de măsline extravirgin",
      "Condimente: boia dulce, usturoi granulat, oregano, sare"
    ],
    instructions: [
      "Fierbe orezul Basmati în raport de 1:2 cu apă și un praf de sare timp de 12 minute.",
      "Gătește pieptul de pui marinat cu condimente pe grătar sau tigaie încinsă timp de 5-6 minute pe parte.",
      "Gătește buchețelele de broccoli la abur timp de 6 minute și adaugă uleiul de măsline la final."
    ]
  };
}

/**
 * AI Nutrition Scanner & Meal Suggestion powered by Gemini 3.8 Flash
 */
export async function generateNutritionSuggestion(
  query: string,
  targetCategory: MealSlotCategory = "pranz",
  targetCalories?: number,
  targetProtein?: number
): Promise<AiMealSuggestion> {
  const fallback = getFallbackMeal(query, targetCategory);

  try {
    const ai = getAI();
    if (!ai) {
      return fallback;
    }

    const prompt = `Ești un Nutriționist Sportiv IFBB Pro și expert în știința nutriției pentru hipertrofie și culturism.
Utilizatorul dorește o masă / rețetă optimizată bazată pe cererea următoare:
"${query}"

Categorie masă dorită: "${targetCategory}".
${targetCalories ? `Țintă calorică aproximativă pentru această masă: ~${targetCalories} kcal.` : ""}
${targetProtein ? `Țintă proteine pentru această masă: ~${targetProtein}g proteine.` : ""}

Cerințe stricte:
1. Calculează matematic macro-nutrienții reali (calorii, proteine, carbohidrați, grăsimi, fibre în grame).
2. Returnează o rețetă completă cu cantități specifice în grame (ex: "180g piept de pui", "80g orez").
3. Răspunde EXCLUSIV cu un JSON valid (fără markdown code blocks, doar JSON brut) cu schema:
{
  "name": string (numele mesei în limba română),
  "description": string (beneficiu pentru hipertrofie/forță/recuperare),
  "category": "${targetCategory}",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fats": number,
  "fiber": number,
  "prepTimeMin": number,
  "ingredients": string[],
  "instructions": string[]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim() || "";
    const cleaned = text.replace(/^```json\n?/, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      name: parsed.name || fallback.name,
      description: parsed.description || fallback.description,
      category: parsed.category || targetCategory,
      calories: typeof parsed.calories === "number" ? parsed.calories : fallback.calories,
      protein: typeof parsed.protein === "number" ? parsed.protein : fallback.protein,
      carbs: typeof parsed.carbs === "number" ? parsed.carbs : fallback.carbs,
      fats: typeof parsed.fats === "number" ? parsed.fats : fallback.fats,
      fiber: typeof parsed.fiber === "number" ? parsed.fiber : fallback.fiber,
      prepTimeMin: typeof parsed.prepTimeMin === "number" ? parsed.prepTimeMin : fallback.prepTimeMin,
      ingredients: Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0 ? parsed.ingredients : fallback.ingredients,
      instructions: Array.isArray(parsed.instructions) && parsed.instructions.length > 0 ? parsed.instructions : fallback.instructions,
    };
  } catch (error) {
    console.warn("AI Nutrition suggestion fallback:", error);
    return fallback;
  }
}

