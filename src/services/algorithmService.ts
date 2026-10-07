import {
  DynamicTdeeOptions,
  DynamicTdeeResult,
  ExerciseEntry,
  MacroDay,
  OverloadOptions,
  OverloadSuggestion,
  ProgressEntry,
  TimelineSession,
  Workout,
  WorkoutTypeRef,
} from "../types";

/**
 * Pure calculation logic only: no localStorage, no network, no React.
 * Every function tolerates missing, empty or malformed input and never returns NaN.
 */

const KCAL_PER_KG = 7700;
const MS_PER_DAY = 86_400_000;
const PLAUSIBLE_TDEE_RANGE = { min: 800, max: 6500 } as const;
const WARMUP_WEIGHT_RATIO = 0.6;

// ---------------------------------------------------------------------------
// Date helpers (local calendar days, DST-safe)
// ---------------------------------------------------------------------------

const DAY_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const ordinalFromParts = (year: number, month: number, day: number): number =>
  Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);

const ordinalFromDate = (date: Date): number =>
  ordinalFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());

/** Accepts "YYYY-MM-DD" or any ISO timestamp. Returns null when unparsable. */
const ordinalFromDateString = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const plain = DAY_KEY_PATTERN.exec(value);
  if (plain) return ordinalFromParts(Number(plain[1]), Number(plain[2]), Number(plain[3]));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : ordinalFromDate(parsed);
};

const isFinitePositive = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

const positiveIntOr = (value: number | undefined, fallback: number): number =>
  isFinitePositive(value) ? Math.max(1, Math.floor(value)) : fallback;

const round = (n: number, decimals = 0): number => {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
};

// ---------------------------------------------------------------------------
// Algorithm 1: Dynamic TDEE (adaptive metabolism)
// ---------------------------------------------------------------------------

/** Total kcal logged for a day; 0 when nothing (valid) was logged. */
export function sumDayCalories(day: MacroDay | null | undefined): number {
  if (!day || !Array.isArray(day.meals)) return 0;
  return day.meals.reduce((sum, meal) => {
    const kcal = meal?.calories;
    return typeof kcal === "number" && Number.isFinite(kcal) && kcal > 0 ? sum + kcal : sum;
  }, 0);
}

/**
 * Estimates real maintenance calories from what the user ate and how their
 * weight actually moved.
 *
 *   dailyBalance = weightChange * 7700 / periodSpanDays      (negative = deficit)
 *   TDEE         = average logged intake - dailyBalance
 *
 * Weight change uses the least-squares trend over the window instead of the raw
 * first/last weigh-in, because a single day of water retention (~1 kg) would
 * otherwise swing the result by ~1000 kcal/day. With only two weigh-ins both
 * methods are identical.
 *
 * Intake is averaged over logged days between the first and last weigh-in
 * (today is never counted: it is still incomplete). Unlogged days are skipped,
 * not treated as 0 kcal.
 */
export function calculateDynamicTDEE(
  weightLogs: readonly ProgressEntry[] | null | undefined,
  nutritionLogs: readonly MacroDay[] | null | undefined,
  options: DynamicTdeeOptions = {}
): DynamicTdeeResult {
  const windowDays = positiveIntOr(options.windowDays, 14);
  const minPeriodDays = positiveIntOr(options.minPeriodDays, 7);
  const minCalorieDays = positiveIntOr(options.minCalorieDays, 5);
  const todayOrdinal = ordinalFromDate(options.today ?? new Date());
  const windowStart = todayOrdinal - (windowDays - 1);

  // One averaged weight per calendar day inside the window.
  const weightsPerDay = new Map<number, number[]>();
  for (const entry of weightLogs ?? []) {
    const day = ordinalFromDateString(entry?.date);
    if (day === null || day < windowStart || day > todayOrdinal) continue;
    if (!isFinitePositive(entry.weight)) continue;
    const bucket = weightsPerDay.get(day);
    if (bucket) bucket.push(entry.weight);
    else weightsPerDay.set(day, [entry.weight]);
  }
  const weightPoints = [...weightsPerDay.entries()]
    .map(([day, values]) => ({ day, weight: values.reduce((a, b) => a + b, 0) / values.length }))
    .sort((a, b) => a.day - b.day);

  // Logged intake per completed calendar day (today excluded).
  const caloriesPerDay = new Map<number, number>();
  for (const log of nutritionLogs ?? []) {
    const day = ordinalFromDateString(log?.date);
    if (day === null || day < windowStart || day >= todayOrdinal) continue;
    const kcal = sumDayCalories(log);
    if (kcal > 0) caloriesPerDay.set(day, (caloriesPerDay.get(day) ?? 0) + kcal);
  }

  const weightDays = weightPoints.length;

  if (weightDays < 2) {
    return {
      status: "insufficient_data",
      reason: "no_weight_data",
      weightDays,
      calorieDays: caloriesPerDay.size,
      periodDays: 0,
    };
  }

  const firstDay = weightPoints[0].day;
  const lastDay = weightPoints[weightDays - 1].day;
  const spanDays = lastDay - firstDay;
  const periodDays = spanDays + 1;

  const intakeValues: number[] = [];
  for (const [day, kcal] of caloriesPerDay) {
    if (day >= firstDay && day < lastDay) intakeValues.push(kcal);
  }
  const calorieDays = intakeValues.length;

  if (periodDays < minPeriodDays) {
    return { status: "insufficient_data", reason: "short_period", weightDays, calorieDays, periodDays };
  }
  if (calorieDays < minCalorieDays) {
    return { status: "insufficient_data", reason: "no_calorie_data", weightDays, calorieDays, periodDays };
  }

  const meanX = weightPoints.reduce((sum, p) => sum + (p.day - firstDay), 0) / weightDays;
  const meanY = weightPoints.reduce((sum, p) => sum + p.weight, 0) / weightDays;
  let sxx = 0;
  let sxy = 0;
  for (const p of weightPoints) {
    const dx = p.day - firstDay - meanX;
    sxx += dx * dx;
    sxy += dx * (p.weight - meanY);
  }
  const slopeKgPerDay = sxx > 0 ? sxy / sxx : 0;
  const weightChangeKg = slopeKgPerDay * spanDays;

  const avgCalories = intakeValues.reduce((a, b) => a + b, 0) / calorieDays;
  const dailyBalance = (weightChangeKg * KCAL_PER_KG) / spanDays;
  const tdee = avgCalories - dailyBalance;

  if (
    !Number.isFinite(tdee) ||
    tdee < PLAUSIBLE_TDEE_RANGE.min ||
    tdee > PLAUSIBLE_TDEE_RANGE.max
  ) {
    return { status: "insufficient_data", reason: "implausible_result", weightDays, calorieDays, periodDays };
  }

  return {
    status: "ok",
    tdee: round(tdee),
    avgCalories: round(avgCalories),
    weightChangeKg: round(weightChangeKg, 2),
    dailyBalance: round(dailyBalance),
    periodDays,
    weightDays,
    calorieDays,
  };
}

// ---------------------------------------------------------------------------
// Algorithm 2: Hypertrophy engine (progressive overload)
// ---------------------------------------------------------------------------

interface SessionSnapshot extends WorkoutTypeRef {
  time: number;
  date: string;
  entries: readonly ExerciseEntry[];
}

// ---------------------------------------------------------------------------
// Session timeline: one state per workout per calendar day
// ---------------------------------------------------------------------------

/**
 * Robust date parser supporting ISO strings, timestamps, and European DD.MM.YYYY formats.
 * Returns 0 when the value cannot be parsed.
 */
export function parseDateToTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const direct = new Date(value).getTime();
  if (!Number.isNaN(direct) && direct > 0) return direct;
  const parts = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    let year = parseInt(parts[3], 10);
    if (year < 100) year += 2000;
    const parsed = new Date(year, month, day).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/** Local calendar day (YYYY-MM-DD) of a timestamp; days compare correctly as strings. */
export function toLocalDayKey(timestamp: number): string {
  const d = new Date(Number.isFinite(timestamp) ? timestamp : 0);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Every recorded state of every workout (saved snapshots + the live version),
 * oldest first. Editing a workout several times creates several states.
 */
export function buildSessionTimeline(workouts: readonly Workout[] | null | undefined): TimelineSession[] {
  const states: TimelineSession[] = [];

  const push = (workoutKey: string, title: string, date: string, entries: unknown): void => {
    if (!Array.isArray(entries)) return;
    const timestamp = parseDateToTimestamp(date);
    states.push({
      workoutKey,
      title,
      date,
      timestamp,
      dayKey: toLocalDayKey(timestamp),
      entries: entries as ExerciseEntry[],
    });
  };

  for (const workout of workouts ?? []) {
    if (!workout) continue;
    for (const snapshot of workout.history ?? []) {
      if (snapshot) push(workout.id, workout.title, snapshot.date, snapshot.entries);
    }
    push(workout.id, workout.title, workout.date, workout.entries);
  }

  return states.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Keeps one state per workout per local calendar day: the latest one.
 * Same-day edits therefore never show up as separate sessions.
 */
export function collapseToDailySessions(timeline: readonly TimelineSession[]): TimelineSession[] {
  const latestPerDay = new Map<string, TimelineSession>();
  for (const state of timeline) {
    const key = `${state.workoutKey}|${state.dayKey}`;
    const current = latestPerDay.get(key);
    if (!current || state.timestamp >= current.timestamp) latestPerDay.set(key, state);
  }
  return [...latestPerDay.values()].sort((a, b) => a.timestamp - b.timestamp);
}

/** Convenience: workouts -> one state per workout per day, oldest first. */
export function buildDailySessions(workouts: readonly Workout[] | null | undefined): TimelineSession[] {
  return collapseToDailySessions(buildSessionTimeline(workouts));
}

/**
 * Most recent entry on a day strictly before `referenceDayKey` that satisfies
 * `matches`. Entries from the reference day are never considered.
 */
export function findPreviousDayEntry(
  dailySessions: readonly TimelineSession[],
  referenceDayKey: string,
  matches: (entry: ExerciseEntry) => boolean
): { session: TimelineSession; entry: ExerciseEntry } | null {
  for (let i = dailySessions.length - 1; i >= 0; i--) {
    const session = dailySessions[i];
    if (session.dayKey >= referenceDayKey) continue;
    const entry = session.entries.find((e) => e && matches(e));
    if (entry) return { session, entry };
  }
  return null;
}

/**
 * Two sessions are the same kind of workout (e.g. both "Pull A") when they are states of the same
 * saved workout, or when their titles match ignoring case, diacritics and spacing. The title rule
 * covers workouts started again from the same routine, which get a new id every time.
 */
export function isSameWorkoutType(a: WorkoutTypeRef, b: WorkoutTypeRef): boolean {
  if (a.workoutKey && a.workoutKey === b.workoutKey) return true;
  const titleA = typeof a.title === "string" ? normalizeName(a.title) : "";
  return titleA !== "" && typeof b.title === "string" && titleA === normalizeName(b.title);
}

/**
 * Baseline for session-to-session progress: the most recent entry matching `matches` inside a
 * session of the same workout type as `reference`, from a calendar day strictly before both the
 * reference session and `today`. The same exercise done in other workouts of the week is ignored,
 * and so are intermediate saves made earlier on the same day.
 */
export function findPreviousSameWorkoutEntry(
  dailySessions: readonly TimelineSession[],
  reference: TimelineSession,
  matches: (entry: ExerciseEntry) => boolean,
  today: Date = new Date()
): { session: TimelineSession; entry: ExerciseEntry } | null {
  const todayKey = toLocalDayKey(today.getTime());
  const cutoffDayKey = reference.dayKey < todayKey ? reference.dayKey : todayKey;
  const sameType = dailySessions.filter((session) => isSameWorkoutType(session, reference));
  return findPreviousDayEntry(sameType, cutoffDayKey, matches);
}

/** True when `date` falls on a different local calendar day than `now`. Unparsable dates return false. */
export function isFromAnotherDay(date: string | null | undefined, now: Date = new Date()): boolean {
  const timestamp = parseDateToTimestamp(date);
  if (timestamp === 0) return false;
  return toLocalDayKey(timestamp) !== toLocalDayKey(now.getTime());
}

/** Idle time after which a session left open across midnight counts as finished. */
export const STALE_SESSION_MS = 3 * 60 * 60 * 1000;

/**
 * An open session must be reset when the local day changed since it started AND the user has been
 * idle for a while, so a workout that merely runs past midnight is never wiped mid-set.
 */
export function shouldResetStaleSession(
  sessionDayKey: string,
  lastActivityMs: number,
  now: Date = new Date()
): boolean {
  if (toLocalDayKey(now.getTime()) === sessionDayKey) return false;
  return now.getTime() - lastActivityMs >= STALE_SESSION_MS;
}

/** Copy of the entries with every set unchecked; weights, reps and RPE are kept. */
export function resetCompletedSets(entries: readonly ExerciseEntry[]): ExerciseEntry[] {
  return entries.map((entry) => ({
    ...entry,
    sets: (Array.isArray(entry.sets) ? entry.sets : []).map((set) => ({ ...set, completed: false, isPR: false })),
  }));
}

/** Case, diacritics and repeated whitespace never make two spellings of the same exercise differ. */
const normalizeName = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const formatKg = (kg: number): string => String(round(kg, 2));

/** Unparsable dates become 0 so they sort last and never produce NaN comparisons. */
const toTime = (date: string): number => parseDateToTimestamp(date);

/** All past sessions: each workout's live entries plus its saved history snapshots. */
const collectSessions = (
  historyData: readonly Workout[],
  excludeWorkoutId: string | undefined
): SessionSnapshot[] => {
  const sessions: SessionSnapshot[] = [];
  for (const workout of historyData) {
    if (!workout) continue;
    const ref: WorkoutTypeRef = { workoutKey: workout.id, title: workout.title };
    if (workout.id !== excludeWorkoutId && Array.isArray(workout.entries)) {
      sessions.push({ ...ref, time: toTime(workout.date), date: workout.date, entries: workout.entries });
    }
    for (const snapshot of workout.history ?? []) {
      if (snapshot && Array.isArray(snapshot.entries)) {
        sessions.push({ ...ref, time: toTime(snapshot.date), date: snapshot.date, entries: snapshot.entries });
      }
    }
  }
  return sessions.sort((a, b) => b.time - a.time);
};

const hasLoggedReps = (set: ExerciseEntry["sets"][number] | null | undefined): set is ExerciseEntry["sets"][number] =>
  !!set &&
  typeof set.weight === "number" && Number.isFinite(set.weight) && set.weight >= 0 &&
  typeof set.reps === "number" && Number.isFinite(set.reps) && set.reps > 0;

/**
 * Looks at the most recent session from an earlier calendar day in which the exercise
 * (same id, or same name ignoring case/diacritics/spacing) was logged and proposes the
 * next target (double progression). With `options.workoutType`, only sessions of that same
 * workout type count (Pull A is never targeted from Pull B):
 *  - every working set reached `targetReps` (default 8) -> add weight
 *  - otherwise                                          -> same weight, +1 rep
 *
 * Ticked sets are preferred; a saved session where nothing was ticked still counts as history
 * through the sets that carry weight and reps. Sets lighter than 60% of the heaviest set are
 * treated as warm-ups and ignored.
 * Returns null only when no earlier session contains the exercise.
 */
export function getOverloadSuggestion(
  exerciseName: string,
  historyData: readonly Workout[] | null | undefined,
  options: OverloadOptions = {}
): OverloadSuggestion | null {
  const targetReps = positiveIntOr(options.targetReps, 8);
  const incrementKg = isFinitePositive(options.incrementKg) ? options.incrementKg : 2.5;
  const wantedName = typeof exerciseName === "string" ? normalizeName(exerciseName) : "";
  if (!wantedName && !options.exerciseId) return null;

  const matches = (entry: ExerciseEntry): boolean =>
    (!!options.exerciseId && entry.exerciseId === options.exerciseId) ||
    (!!wantedName && typeof entry.name === "string" && normalizeName(entry.name) === wantedName);

  const todayKey = toLocalDayKey((options.today ?? new Date()).getTime());
  const workoutType = options.workoutType;

  for (const session of collectSessions(historyData ?? [], options.excludeWorkoutId)) {
    if (toLocalDayKey(session.time) >= todayKey) continue;
    if (workoutType && !isSameWorkoutType(session, workoutType)) continue;

    const loggedSets = session.entries
      .filter((entry) => entry && matches(entry) && Array.isArray(entry.sets))
      .flatMap((entry) => entry.sets)
      .filter(hasLoggedReps);

    const tickedSets = loggedSets.filter((set) => set.completed === true);
    const doneSets = tickedSets.length > 0 ? tickedSets : loggedSets;

    if (doneSets.length === 0) continue;

    const topWeight = Math.max(...doneSets.map((set) => set.weight));
    const workingSets =
      topWeight > 0
        ? doneSets.filter((set) => set.weight >= topWeight * WARMUP_WEIGHT_RATIO)
        : doneSets;

    const allReachedTarget = workingSets.every((set) => set.reps >= targetReps);

    if (allReachedTarget && topWeight > 0) {
      const nextWeightKg = round(topWeight + incrementKg, 2);
      return {
        kind: "increase_weight",
        label: `+${formatKg(incrementKg)}kg (Ex: ${formatKg(nextWeightKg)}kg)`,
        nextWeightKg,
        nextReps: targetReps,
        lastWeightKg: topWeight,
        lastSessionDate: session.date,
      };
    }

    const lowestReps = Math.min(...workingSets.map((set) => set.reps));
    return {
      kind: "increase_reps",
      label: "+1 Repetare (Aceeași greutate)",
      nextWeightKg: topWeight,
      nextReps: Math.floor(lowestReps) + 1,
      lastWeightKg: topWeight,
      lastSessionDate: session.date,
    };
  }

  return null;
}

/** On-screen target, e.g. "Țintă: 82.5kg × 8 (+2.5kg față de ultima sesiune)". */
export function describeOverloadTarget(suggestion: OverloadSuggestion): string {
  const target = `${formatKg(suggestion.nextWeightKg)}kg × ${suggestion.nextReps}`;
  if (suggestion.kind === "increase_weight") {
    const delta = round(suggestion.nextWeightKg - suggestion.lastWeightKg, 2);
    return `Țintă: ${target} (+${formatKg(delta)}kg față de ultima sesiune)`;
  }
  return `Țintă: ${target} (+1 repetare față de ultima sesiune)`;
}

/** String-only variant of {@link getOverloadSuggestion}. */
export function suggestNextOverload(
  exerciseName: string,
  historyData: readonly Workout[] | null | undefined,
  options: OverloadOptions = {}
): string | null {
  return getOverloadSuggestion(exerciseName, historyData, options)?.label ?? null;
}
