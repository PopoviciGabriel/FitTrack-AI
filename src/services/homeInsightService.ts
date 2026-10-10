import { HomeCoachInsight, HomeDayState, MacroDay, MacroGoal, MacroTotals, Workout } from "../types";
import { buildDailySessions, parseDateToTimestamp, toLocalDayKey } from "./algorithmService";
import { foldText, loadMacroDay, loadMacroGoal } from "./storageService";

/**
 * Home "AI Coach Insight": reads the user's current day from local storage and turns it into one
 * immediate action. Synchronous and deterministic, so the card never waits for the network.
 */

/** Must match DEFAULT_GOAL in NutritionView, so both screens show the same targets before a goal is saved. */
const DEFAULT_MACRO_GOAL: MacroGoal = {
  type: "hypertrophy",
  calories: 2850,
  protein: 180,
  carbs: 330,
  fats: 75,
  fiber: 38,
  waterMl: 3500,
};

const REST_DAY_LOOKBACK_DAYS = 28;
/** With less history the usual weekly frequency is a guess, so no day is treated as a rest day. */
const MIN_HISTORY_DAYS_FOR_REST = 14;
const PROTEIN_TOLERANCE_G = 5;
const KCAL_TOLERANCE = 150;

const dayKeyAt = (now: Date, daysAgo: number): string =>
  toLocalDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo).getTime());

const workoutTypeKey = (workout: Workout): string => foldText(workout.title.replace(/\s+/g, " ").trim()) || workout.id;

function sumMeals(day: MacroDay): MacroTotals {
  return day.meals.reduce<MacroTotals>(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fats: acc.fats + meal.fats,
      fiber: acc.fiber + (meal.fiber ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
  );
}

/**
 * True when the user already trained their usual number of days (estimated over the last 4 weeks)
 * in the 6 days before today, e.g. a 4-day-a-week lifter who trained Mon, Tue, Thu and Fri rests on Saturday.
 */
function isRestDay(trainingDays: ReadonlySet<string>, now: Date): boolean {
  const todayKey = dayKeyAt(now, 0);
  let firstKey: string | null = null;
  for (const key of trainingDays) {
    if (key < todayKey && (firstKey === null || key < firstKey)) firstKey = key;
  }
  if (firstKey === null) return false;

  let windowDays = 0;
  let trainedInWindow = 0;
  let trainedLastSixDays = 0;
  for (let daysAgo = 1; daysAgo <= REST_DAY_LOOKBACK_DAYS; daysAgo++) {
    const key = dayKeyAt(now, daysAgo);
    if (key < firstKey) break;
    windowDays++;
    if (!trainingDays.has(key)) continue;
    trainedInWindow++;
    if (daysAgo <= 6) trainedLastSixDays++;
  }
  if (windowDays < MIN_HISTORY_DAYS_FOR_REST) return false;

  const usualDaysPerWeek = Math.round((trainedInWindow / windowDays) * 7);
  return usualDaysPerWeek > 0 && usualDaysPerWeek < 7 && trainedLastSixDays >= usualDaysPerWeek;
}

interface WorkoutTypeState {
  latest: Workout;
  latestMs: number;
  doneToday: boolean;
}

export function buildHomeDayState(workouts: readonly Workout[], now: Date = new Date()): HomeDayState {
  const nowMs = now.getTime();
  const todayKey = toLocalDayKey(nowMs);

  // Saved workouts are workout types ("Push A"): `date` is the last session, `history` the earlier ones.
  const types = new Map<string, WorkoutTypeState>();
  let plannedToday: Workout | null = null;
  for (const workout of workouts) {
    if (!workout || !Array.isArray(workout.entries) || workout.entries.length === 0) continue;
    const ms = parseDateToTimestamp(workout.date);
    if (ms > nowMs) {
      if (toLocalDayKey(ms) === todayKey) plannedToday ??= workout;
      continue;
    }
    const doneToday = ms > 0 && toLocalDayKey(ms) === todayKey;
    const key = workoutTypeKey(workout);
    const current = types.get(key);
    if (!current) {
      types.set(key, { latest: workout, latestMs: ms, doneToday });
      continue;
    }
    current.doneToday ||= doneToday;
    if (ms > current.latestMs) {
      current.latest = workout;
      current.latestMs = ms;
    }
  }

  let completed: WorkoutTypeState | null = null;
  let leastRecent: WorkoutTypeState | null = null;
  for (const type of types.values()) {
    if (type.doneToday) {
      if (!completed || type.latestMs > completed.latestMs) completed = type;
    } else if (!leastRecent || type.latestMs < leastRecent.latestMs) {
      leastRecent = type;
    }
  }

  const trainingDays = new Set(
    buildDailySessions(workouts)
      .filter((session) => session.timestamp > 0 && session.timestamp <= nowMs && session.entries.length > 0)
      .map((session) => session.dayKey)
  );

  const goal = loadMacroGoal(DEFAULT_MACRO_GOAL);
  const day = loadMacroDay(todayKey, {
    date: todayKey,
    targetCalories: goal.calories,
    targetProtein: goal.protein,
    targetCarbs: goal.carbs,
    targetFats: goal.fats,
    targetFiber: goal.fiber,
    targetWaterMl: goal.waterMl,
    waterMl: 0,
    meals: [],
  });

  return {
    hour: now.getHours(),
    hasWorkouts: types.size > 0 || plannedToday !== null,
    completedWorkoutTitle: completed ? completed.latest.title : null,
    scheduledWorkout: plannedToday ?? leastRecent?.latest ?? null,
    isRestDay: !completed && !plannedToday && isRestDay(trainingDays, now),
    consumed: sumMeals(day),
    targets: {
      calories: day.targetCalories,
      protein: day.targetProtein,
      carbs: day.targetCarbs,
      fats: day.targetFats,
      fiber: day.targetFiber ?? goal.fiber ?? 38,
    },
    mealsLogged: day.meals.length,
  };
}

function nutritionInsight(state: HomeDayState): HomeCoachInsight {
  const lead = state.completedWorkoutTitle
    ? `Ai bifat „${state.completedWorkoutTitle}” azi.`
    : state.isRestDay
      ? "Azi e zi de recuperare."
      : "";
  const kcalLeft = Math.round(state.targets.calories - state.consumed.calories);
  const proteinLeft = Math.round(state.targets.protein - state.consumed.protein);

  let body: string;
  let actionLabel = "Adaugă masă";
  if (state.mealsLogged === 0) {
    body = `Ținta ta e ${Math.round(state.targets.calories)} kcal și ${Math.round(state.targets.protein)}g proteine, iar prima masă te pune pe drumul cel bun.`;
  } else if (proteinLeft > PROTEIN_TOLERANCE_G && kcalLeft > 50) {
    body = `Mai ai nevoie de ${proteinLeft}g proteine și ${kcalLeft} kcal pentru a-ți atinge obiectivul.`;
  } else if (proteinLeft > PROTEIN_TOLERANCE_G) {
    body = `Mai ai nevoie de ${proteinLeft}g proteine, din surse slabe ca să rămâi în ținta calorică.`;
  } else if (kcalLeft > KCAL_TOLERANCE) {
    body = `Proteinele sunt acoperite, iar pentru restul zilei mai ai ${kcalLeft} kcal.`;
  } else if (kcalLeft < -KCAL_TOLERANCE) {
    body = `Ești cu ${-kcalLeft} kcal peste țintă, așa că restul zilei mergi pe legume și proteine slabe.`;
    actionLabel = "Vezi jurnalul";
  } else {
    body = "Calorii și proteine atinse, exact ce îți trebuie pentru recuperare.";
    actionLabel = "Vezi jurnalul";
  }

  return { kind: "nutrition", text: lead ? `${lead} ${body}` : body, action: "log_meal", actionLabel };
}

/** Today's single priority: the scheduled workout first, then the calories and protein still missing. */
export function buildLocalHomeInsight(state: HomeDayState): HomeCoachInsight {
  if (!state.hasWorkouts) {
    return {
      kind: "first_workout",
      text: "Creează primul antrenament și bifează seriile. De aici înainte îți spun zilnic ce ai de făcut.",
      action: "create_workout",
      actionLabel: "Creează antrenament",
    };
  }

  if (!state.completedWorkoutTitle && !state.isRestDay && state.scheduledWorkout) {
    return {
      kind: "workout_pending",
      text: `Azi ai programat „${state.scheduledWorkout.title}”. Începe sesiunea pentru a menține progresul!`,
      action: "start_workout",
      actionLabel: "Începe acum",
      workout: state.scheduledWorkout,
    };
  }

  return nutritionInsight(state);
}
