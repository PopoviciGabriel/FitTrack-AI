import {
  CUSTOM_EXERCISE_ID_PREFIX,
  CustomExercise,
  CustomMuscleGroup,
  Exercise,
  PRESET_EXERCISES,
} from "../types";
import {
  MAX_CUSTOM_EXERCISES,
  exerciseNameKey,
  foldText,
  normalizeExerciseName,
  saveCustomExercises,
} from "./storageService";

export type CustomExerciseResult =
  | { ok: true; exercise: CustomExercise; exercises: CustomExercise[] }
  | { ok: false; error: string };

const MIN_SEARCH_CATEGORY_LENGTH = 3;

export const isCustomExerciseId = (id: string | undefined): boolean =>
  typeof id === "string" && id.startsWith(CUSTOM_EXERCISE_ID_PREFIX);

/**
 * Validates and stores a new user exercise. Names are unique (ignoring case and
 * diacritics) across both the built-in database and the user's own exercises.
 */
export function createCustomExercise(
  rawName: string,
  muscleGroup: CustomMuscleGroup,
  existing: readonly CustomExercise[]
): CustomExerciseResult {
  const name = normalizeExerciseName(rawName);
  if (!name) {
    return { ok: false, error: "Introdu un nume pentru exercițiu." };
  }

  const key = exerciseNameKey(name);
  const taken =
    PRESET_EXERCISES.some((p) => exerciseNameKey(p.name) === key) ||
    existing.some((c) => exerciseNameKey(c.name) === key);
  if (taken) {
    return { ok: false, error: "Există deja un exercițiu cu acest nume." };
  }

  if (existing.length >= MAX_CUSTOM_EXERCISES) {
    return { ok: false, error: `Ai atins limita de ${MAX_CUSTOM_EXERCISES} exerciții custom.` };
  }

  const exercise: CustomExercise = {
    id: `${CUSTOM_EXERCISE_ID_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`,
    name,
    muscleGroup,
    createdAt: new Date().toISOString(),
  };
  const exercises = [exercise, ...existing];

  if (!saveCustomExercises(exercises)) {
    return { ok: false, error: "Nu am putut salva exercițiul pe acest dispozitiv (memorie plină sau blocată)." };
  }
  return { ok: true, exercise, exercises };
}

/** Removes a custom exercise. Past workouts keep their entries untouched. */
export function deleteCustomExercise(id: string, existing: readonly CustomExercise[]): CustomExercise[] {
  const remaining = existing.filter((c) => c.id !== id);
  saveCustomExercises(remaining);
  return remaining;
}

export const toExercise = (custom: CustomExercise): Exercise => ({
  id: custom.id,
  name: custom.name,
  category: custom.muscleGroup,
  isCustom: true,
});

/** User exercises first (newest first), followed by the built-in database. */
export function buildExerciseCatalog(custom: readonly CustomExercise[]): Exercise[] {
  return [...custom.map(toExercise), ...PRESET_EXERCISES];
}

/**
 * Case/diacritic-insensitive search by name. The muscle group is matched too,
 * but only for queries of 3+ characters so short queries stay precise.
 */
export function filterExercises(exercises: readonly Exercise[], query: string): Exercise[] {
  const term = foldText(query.trim());
  if (!term) return [...exercises];
  const matchCategory = term.length >= MIN_SEARCH_CATEGORY_LENGTH;
  return exercises.filter(
    (ex) => foldText(ex.name).includes(term) || (matchCategory && foldText(ex.category).includes(term))
  );
}

/** Label used by the analytics views for a custom exercise's muscle group. */
export function customGroupToAnalyticsCategory(group: CustomMuscleGroup): string {
  switch (group) {
    case "Core":
      return "Abdomen";
    case "Full Body":
      return "Full Body / Olimpic";
    case "Altele":
      return "Alte Grupe";
    default:
      return group;
  }
}
