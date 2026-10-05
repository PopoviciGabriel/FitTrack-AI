import {
  ChatMessage,
  CUSTOM_EXERCISE_ID_PREFIX,
  CUSTOM_MUSCLE_GROUPS,
  CustomExercise,
  CustomMuscleGroup,
  ExerciseEntry,
  MacroDay,
  MacroGoal,
  MacroMealItem,
  ProgressEntry,
  RoutineTemplate,
  Set as WorkoutSet,
  Workout,
  WorkoutSnapshot,
} from "../types";

/**
 * Persistence layer. Everything that comes out of localStorage (or an imported
 * backup) is treated as untrusted: it is validated and normalised here, so the
 * UI never sees NaN, missing arrays or malformed records.
 */

export const STORAGE_KEYS = {
  workouts: "workouts",
  progress: "progress",
  customExercises: "fittrack_custom_exercises",
  macroGoal: "fittrack_macro_goal",
  routines: "fittrack_routines_v1",
  chat: "fittrack_ai_expert_chat",
  nutritionPrefix: "fittrack_nutrition_",
} as const;

export const MAX_CUSTOM_EXERCISES = 500;
export const MAX_EXERCISE_NAME_LENGTH = 60;

// ---------------------------------------------------------------------------
// Low-level safe access
// ---------------------------------------------------------------------------

/**
 * Safe localStorage JSON reader: returns the fallback when the key is missing,
 * the JSON is corrupt, or storage is unavailable (e.g. private mode).
 * The parsed value is NOT validated: callers must check its shape.
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch (err) {
    console.warn(`FitTrack Pro: nu am putut citi "${key}" din localStorage.`, err);
    return fallback;
  }
}

/**
 * Safe localStorage JSON writer. Returns false (instead of throwing) when the
 * quota is exceeded or storage is unavailable.
 */
export function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`FitTrack Pro: nu am putut salva "${key}" în localStorage.`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Validation primitives
// ---------------------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Finite number from a number or a numeric string; null otherwise. */
const toNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const nonNegativeOr = (value: unknown, fallback: number): number => {
  const n = toNumber(value);
  return n !== null && n >= 0 ? n : fallback;
};

const positiveOr = (value: unknown, fallback: number): number => {
  const n = toNumber(value);
  return n !== null && n > 0 ? n : fallback;
};

const stringOr = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() !== "" ? value : fallback;

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined;

const newId = (): string => Math.random().toString(36).substring(2, 9);

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isMuscleGroup = (value: unknown): value is CustomMuscleGroup =>
  typeof value === "string" && (CUSTOM_MUSCLE_GROUPS as readonly string[]).includes(value);

/** Keeps the first occurrence of each id; replaces repeated or missing ids. */
function uniqueIds<T extends { id: string }>(items: T[]): T[] {
  const seen = new Map<string, number>();
  return items.map((item, index) => {
    const count = seen.get(item.id) ?? 0;
    seen.set(item.id, count + 1);
    return count === 0 ? item : { ...item, id: `${item.id}-${index}` };
  });
}

// ---------------------------------------------------------------------------
// Workouts & progress
// ---------------------------------------------------------------------------

function sanitizeSet(raw: unknown, index: number): WorkoutSet | null {
  if (!isRecord(raw)) return null;
  const rpe = toNumber(raw.rpe);
  const set: WorkoutSet = {
    id: stringOr(raw.id, String(index + 1)),
    weight: nonNegativeOr(raw.weight, 0),
    reps: nonNegativeOr(raw.reps, 0),
    completed: raw.completed === true,
  };
  if (rpe !== null && rpe >= 1 && rpe <= 10) set.rpe = rpe;
  if (raw.isPR === true) set.isPR = true;
  return set;
}

function sanitizeEntry(raw: unknown): ExerciseEntry | null {
  if (!isRecord(raw)) return null;
  const name = stringOr(raw.name, "Exercițiu").trim();
  const sets = Array.isArray(raw.sets)
    ? raw.sets.map(sanitizeSet).filter((s): s is WorkoutSet => s !== null)
    : [];
  const entry: ExerciseEntry = {
    id: stringOr(raw.id, newId()),
    exerciseId: stringOr(raw.exerciseId, slugify(name) || "exercise"),
    name,
    sets: uniqueIds(sets),
  };
  const notes = optionalString(raw.notes);
  if (notes) entry.notes = notes;
  if (isMuscleGroup(raw.muscleGroup)) entry.muscleGroup = raw.muscleGroup;
  return entry;
}

function sanitizeEntries(raw: unknown): ExerciseEntry[] {
  if (!Array.isArray(raw)) return [];
  return uniqueIds(raw.map(sanitizeEntry).filter((e): e is ExerciseEntry => e !== null));
}

function sanitizeSnapshot(raw: unknown): WorkoutSnapshot | null {
  if (!isRecord(raw) || typeof raw.date !== "string" || raw.date === "") return null;
  return { date: raw.date, entries: sanitizeEntries(raw.entries) };
}

function sanitizeWorkout(raw: unknown): Workout | null {
  if (!isRecord(raw)) return null;
  const workout: Workout = {
    id: stringOr(raw.id, newId()),
    date: stringOr(raw.date, new Date().toISOString()),
    title: stringOr(raw.title, "Antrenament").trim(),
    entries: sanitizeEntries(raw.entries),
  };
  if (Array.isArray(raw.history)) {
    workout.history = raw.history
      .map(sanitizeSnapshot)
      .filter((s): s is WorkoutSnapshot => s !== null);
  }
  const duration = toNumber(raw.durationSeconds);
  if (duration !== null && duration >= 0) workout.durationSeconds = Math.round(duration);
  return workout;
}

/** Validates a parsed workouts payload. Invalid records are dropped, ids made unique. */
export function sanitizeWorkouts(raw: unknown): Workout[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: Workout[] = [];
  for (const item of raw) {
    const workout = sanitizeWorkout(item);
    if (!workout || seen.has(workout.id)) continue;
    seen.add(workout.id);
    result.push(workout);
  }
  return result;
}

/** Validates a parsed weight-log payload and returns it oldest first. */
export function sanitizeProgress(raw: unknown): ProgressEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: ProgressEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const weight = toNumber(item.weight);
    if (weight === null || weight <= 0 || weight >= 500) continue;
    if (typeof item.date !== "string" || item.date === "") continue;
    const entry: ProgressEntry = { id: stringOr(item.id, newId()), date: item.date, weight };
    const bodyFat = toNumber(item.bodyFat);
    if (bodyFat !== null && bodyFat >= 0 && bodyFat <= 100) entry.bodyFat = bodyFat;
    entries.push(entry);
  }
  const keyed = uniqueIds(entries);
  return keyed.sort((a, b) => {
    const ta = Date.parse(a.date);
    const tb = Date.parse(b.date);
    return Number.isNaN(ta) || Number.isNaN(tb) ? 0 : ta - tb;
  });
}

export function loadWorkouts(): Workout[] {
  return sanitizeWorkouts(readJson<unknown>(STORAGE_KEYS.workouts, []));
}

export function loadProgress(): ProgressEntry[] {
  return sanitizeProgress(readJson<unknown>(STORAGE_KEYS.progress, []));
}

/** Persists both collections; false when at least one write failed. */
export function saveWorkoutData(workouts: Workout[], progress: ProgressEntry[]): boolean {
  const workoutsSaved = writeJson(STORAGE_KEYS.workouts, workouts);
  const progressSaved = writeJson(STORAGE_KEYS.progress, progress);
  return workoutsSaved && progressSaved;
}

// ---------------------------------------------------------------------------
// Custom exercises
// ---------------------------------------------------------------------------

export function normalizeExerciseName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_EXERCISE_NAME_LENGTH).trim();
}

/** Lower-cases and strips diacritics so "Brațe" and "brate" compare equal. */
export function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Case- and accent-insensitive key used to detect duplicate exercise names. */
export function exerciseNameKey(name: string): string {
  return foldText(normalizeExerciseName(name));
}

export function sanitizeCustomExercises(raw: unknown): CustomExercise[] {
  if (!Array.isArray(raw)) return [];
  const usedIds = new Set<string>();
  const usedNames = new Set<string>();
  const result: CustomExercise[] = [];

  for (const item of raw) {
    if (!isRecord(item) || typeof item.name !== "string") continue;
    const name = normalizeExerciseName(item.name);
    const nameKey = exerciseNameKey(name);
    if (!name || usedNames.has(nameKey)) continue;

    let id =
      typeof item.id === "string" && item.id.startsWith(CUSTOM_EXERCISE_ID_PREFIX)
        ? item.id
        : `${CUSTOM_EXERCISE_ID_PREFIX}${newId()}`;
    while (usedIds.has(id)) id = `${CUSTOM_EXERCISE_ID_PREFIX}${newId()}`;

    usedIds.add(id);
    usedNames.add(nameKey);
    result.push({
      id,
      name,
      muscleGroup: isMuscleGroup(item.muscleGroup) ? item.muscleGroup : "Altele",
      createdAt: stringOr(item.createdAt, new Date().toISOString()),
    });
    if (result.length >= MAX_CUSTOM_EXERCISES) break;
  }
  return result;
}

export function loadCustomExercises(): CustomExercise[] {
  return sanitizeCustomExercises(readJson<unknown>(STORAGE_KEYS.customExercises, []));
}

export function saveCustomExercises(exercises: CustomExercise[]): boolean {
  return writeJson(STORAGE_KEYS.customExercises, exercises);
}

/**
 * Adds backed-up custom exercises to the stored ones; stored items win on
 * duplicate ids or names. Returns the merged list.
 */
export function mergeCustomExercises(incoming: unknown): CustomExercise[] {
  const merged = sanitizeCustomExercises([...loadCustomExercises(), ...sanitizeCustomExercises(incoming)]);
  saveCustomExercises(merged);
  return merged;
}

// ---------------------------------------------------------------------------
// Routines
// ---------------------------------------------------------------------------

const ROUTINE_SPLITS: readonly RoutineTemplate["split"][] = ["PPL", "Upper/Lower", "Full Body", "Arnold", "Custom"];

/** Validates stored routines; null when the payload is not a usable list so the caller keeps its defaults. */
export function sanitizeRoutines(raw: unknown): RoutineTemplate[] | null {
  if (!Array.isArray(raw)) return null;
  const usedIds = new Set<string>();
  const routines: RoutineTemplate[] = [];

  for (const item of raw) {
    if (!isRecord(item) || typeof item.name !== "string" || item.name.trim() === "") continue;
    const exercises: RoutineTemplate["exercises"] = [];
    if (Array.isArray(item.exercises)) {
      for (const ex of item.exercises) {
        if (!isRecord(ex) || typeof ex.name !== "string" || ex.name.trim() === "") continue;
        exercises.push({
          exerciseId: stringOr(ex.exerciseId, slugify(ex.name)),
          name: ex.name,
          defaultSets: Math.min(20, Math.max(1, Math.round(positiveOr(ex.defaultSets, 3)))),
          targetReps: Math.min(100, Math.max(1, Math.round(positiveOr(ex.targetReps, 10)))),
        });
      }
    }
    let id = stringOr(item.id, `routine-${newId()}`);
    while (usedIds.has(id)) id = `routine-${newId()}`;
    usedIds.add(id);
    routines.push({
      id,
      name: item.name,
      description: typeof item.description === "string" ? item.description : "",
      split: ROUTINE_SPLITS.includes(item.split as RoutineTemplate["split"])
        ? (item.split as RoutineTemplate["split"])
        : "Custom",
      exerciseIds: exercises.map((e) => e.exerciseId),
      exercises,
    });
  }
  return routines;
}

export function loadRoutines(fallback: RoutineTemplate[]): RoutineTemplate[] {
  return sanitizeRoutines(readJson<unknown>(STORAGE_KEYS.routines, null)) ?? fallback;
}

export function saveRoutines(routines: RoutineTemplate[]): boolean {
  return writeJson(STORAGE_KEYS.routines, routines);
}

// ---------------------------------------------------------------------------
// AI coach chat
// ---------------------------------------------------------------------------

export const MAX_CHAT_MESSAGES = 100;
const LEGACY_COACH_ANSWER_KEY = "fittrack_last_coach_answer";

export function sanitizeChatMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const messages: ChatMessage[] = [];
  const usedIds = new Set<string>();
  for (const item of raw) {
    if (!isRecord(item) || typeof item.text !== "string" || item.text.trim() === "") continue;
    if (item.role !== "user" && item.role !== "assistant") continue;
    let id = stringOr(item.id, `msg-${newId()}`);
    while (usedIds.has(id)) id = `msg-${newId()}`;
    usedIds.add(id);
    messages.push({ id, role: item.role, text: item.text, timestamp: typeof item.timestamp === "string" ? item.timestamp : "" });
  }
  return messages.slice(-MAX_CHAT_MESSAGES);
}

/** Stored chat history, or the migrated legacy answer, or an empty list. */
export function loadChatMessages(): ChatMessage[] {
  const stored = sanitizeChatMessages(readJson<unknown>(STORAGE_KEYS.chat, []));
  if (stored.length > 0) return stored;

  try {
    const legacy = localStorage.getItem(LEGACY_COACH_ANSWER_KEY);
    if (legacy && legacy.trim() !== "") {
      return [{ id: "welcome-1", role: "assistant", text: legacy, timestamp: "" }];
    }
  } catch {
    // storage unavailable
  }
  return [];
}

export function saveChatMessages(messages: ChatMessage[]): boolean {
  return writeJson(STORAGE_KEYS.chat, messages.slice(-MAX_CHAT_MESSAGES));
}

// ---------------------------------------------------------------------------
// Nutrition
// ---------------------------------------------------------------------------

const MACRO_GOAL_TYPES: readonly MacroGoal["type"][] = ["hypertrophy", "maintenance", "cutting"];

export const nutritionKey = (dateKey: string): string => `${STORAGE_KEYS.nutritionPrefix}${dateKey}`;

export function sanitizeMacroGoal(raw: unknown, fallback: MacroGoal): MacroGoal {
  if (!isRecord(raw)) return fallback;
  return {
    type: MACRO_GOAL_TYPES.includes(raw.type as MacroGoal["type"]) ? (raw.type as MacroGoal["type"]) : fallback.type,
    calories: positiveOr(raw.calories, fallback.calories),
    protein: positiveOr(raw.protein, fallback.protein),
    carbs: positiveOr(raw.carbs, fallback.carbs),
    fats: positiveOr(raw.fats, fallback.fats),
    fiber: positiveOr(raw.fiber, fallback.fiber ?? 38),
    waterMl: positiveOr(raw.waterMl, fallback.waterMl ?? 3500),
  };
}

export function loadMacroGoal(fallback: MacroGoal): MacroGoal {
  return sanitizeMacroGoal(readJson<unknown>(STORAGE_KEYS.macroGoal, null), fallback);
}

export function saveMacroGoal(goal: MacroGoal): boolean {
  return writeJson(STORAGE_KEYS.macroGoal, goal);
}

function sanitizeMeal(raw: unknown): MacroMealItem | null {
  if (!isRecord(raw)) return null;
  const meal: MacroMealItem = {
    id: stringOr(raw.id, newId()),
    name: stringOr(raw.name, "Aliment"),
    category: typeof raw.category === "string" ? raw.category : "",
    grams: nonNegativeOr(raw.grams, 0),
    calories: nonNegativeOr(raw.calories, 0),
    protein: nonNegativeOr(raw.protein, 0),
    carbs: nonNegativeOr(raw.carbs, 0),
    fats: nonNegativeOr(raw.fats, 0),
  };
  for (const key of ["fiber", "sugar", "sodium"] as const) {
    const n = toNumber(raw[key]);
    if (n !== null && n >= 0) meal[key] = n;
  }
  for (const key of ["time", "barcode", "brand", "imageUrl"] as const) {
    const s = optionalString(raw[key]);
    if (s) meal[key] = s;
  }
  return meal;
}

/**
 * Validates one stored day. `fallback` supplies the empty day (and default
 * targets) used for anything missing or invalid. The returned day always
 * carries `dateKey` as its date.
 */
export function sanitizeMacroDay(raw: unknown, dateKey: string, fallback: MacroDay): MacroDay {
  if (!isRecord(raw)) return { ...fallback, date: dateKey };

  const meals = Array.isArray(raw.meals)
    ? uniqueIds(raw.meals.map(sanitizeMeal).filter((m): m is MacroMealItem => m !== null))
    : [];

  const slotSource: unknown[] = Array.isArray(raw.customSlots)
    ? raw.customSlots
    : meals.map((m) => m.category);
  const slots: string[] = [];
  for (const slot of slotSource) {
    if (typeof slot !== "string") continue;
    const trimmed = slot.trim();
    if (trimmed && !slots.some((s) => s.toLowerCase() === trimmed.toLowerCase())) slots.push(trimmed);
  }

  return {
    date: dateKey,
    targetCalories: positiveOr(raw.targetCalories, fallback.targetCalories),
    targetProtein: positiveOr(raw.targetProtein, fallback.targetProtein),
    targetCarbs: positiveOr(raw.targetCarbs, fallback.targetCarbs),
    targetFats: positiveOr(raw.targetFats, fallback.targetFats),
    targetFiber: positiveOr(raw.targetFiber, fallback.targetFiber ?? 38),
    targetWaterMl: positiveOr(raw.targetWaterMl, fallback.targetWaterMl ?? 3500),
    waterMl: nonNegativeOr(raw.waterMl, 0),
    meals,
    customSlots: slots,
  };
}

export function loadMacroDay(dateKey: string, fallback: MacroDay): MacroDay {
  return sanitizeMacroDay(readJson<unknown>(nutritionKey(dateKey), null), dateKey, fallback);
}

export function saveMacroDay(day: MacroDay): boolean {
  return writeJson(nutritionKey(day.date), day);
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * Loads the stored nutrition logs (`fittrack_nutrition_YYYY-MM-DD`) for the last
 * `days` days, today included. Missing or corrupt days are skipped.
 */
export function loadNutritionLogs(days: number, today: Date = new Date()): MacroDay[] {
  const logs: MacroDay[] = [];
  for (let offset = 0; offset < days; offset++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const dateKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const stored = readJson<unknown>(nutritionKey(dateKey), null);
    if (isRecord(stored)) {
      logs.push(
        sanitizeMacroDay(stored, dateKey, {
          date: dateKey,
          targetCalories: 0,
          targetProtein: 0,
          targetCarbs: 0,
          targetFats: 0,
          waterMl: 0,
          meals: [],
        })
      );
    }
  }
  return logs;
}
