import foodsJson from "../data/foods.json";
import { BODYBUILDING_FOOD_DATABASE } from "../data/foodDatabase";
import { FoodCategory, FoodItem, FoodSearchOptions, MacroMealItem, MealSlotCategory } from "../types";

/**
 * Offline fuzzy food search. No network, no storage: everything runs against
 * the bundled databases and the index is built lazily on the first search.
 */

const FOOD_CATEGORIES: readonly FoodCategory[] = [
  "Proteine",
  "Carbohidrați Complecși",
  "Grăsimi Sănătoase",
  "Lactate & Shake-uri",
  "Legume & Fructe",
];

const DEFAULT_LIMIT = 30;
const MIN_TOKEN_SCORE = 0.5;
const STOP_WORDS: ReadonlySet<string> = new Set(["de", "la", "cu", "din", "si", "in", "pe", "a"]);

// ---------------------------------------------------------------------------
// Edit distance
// ---------------------------------------------------------------------------

/**
 * Edit distance between two strings (insert, delete, substitute; an adjacent
 * swap such as "piu" -> "pui" counts as one edit, which is what people actually
 * mistype). Uses three rolling rows, O(a*b) time and O(b) memory, and stops as
 * soon as the distance is guaranteed to exceed `maxDistance`, in which case it
 * returns `maxDistance + 1`.
 */
export function levenshteinDistance(a: string, b: string, maxDistance = Number.POSITIVE_INFINITY): number {
  if (a === b) return 0;
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return Math.min(bLen, maxDistance + 1);
  if (bLen === 0) return Math.min(aLen, maxDistance + 1);
  if (Math.abs(aLen - bLen) > maxDistance) return maxDistance + 1;

  let beforePrev = new Int32Array(bLen + 1);
  let prev = new Int32Array(bLen + 1);
  let curr = new Int32Array(bLen + 1);
  for (let j = 0; j <= bLen; j++) prev[j] = j;

  for (let i = 1; i <= aLen; i++) {
    curr[0] = i;
    let rowMin = i;
    const aChar = a.charCodeAt(i - 1);

    for (let j = 1; j <= bLen; j++) {
      const bChar = b.charCodeAt(j - 1);
      let value = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (aChar === bChar ? 0 : 1)
      );
      if (i > 1 && j > 1 && aChar === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === bChar) {
        value = Math.min(value, beforePrev[j - 2] + 1);
      }
      curr[j] = value;
      if (value < rowMin) rowMin = value;
    }

    if (rowMin > maxDistance) return maxDistance + 1;
    const recycled = beforePrev;
    beforePrev = prev;
    prev = curr;
    curr = recycled;
  }

  return Math.min(prev[bLen], maxDistance + 1);
}

// ---------------------------------------------------------------------------
// Normalization & scoring
// ---------------------------------------------------------------------------

/** Lowercase, strip diacritics (ă, â, î, ș, ț ...) and punctuation. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const tokenize = (text: string): string[] => {
  const tokens = normalizeText(text).split(" ").filter(Boolean);
  const meaningful = tokens.filter((t) => !STOP_WORDS.has(t));
  return meaningful.length > 0 ? meaningful : tokens;
};

/** Edits tolerated for a query token of the given length. */
const allowedEdits = (length: number): number => (length < 3 ? 0 : length <= 5 ? 1 : 2);

const sortedLetters = (text: string): string => [...text].sort().join("");

/**
 * With only 3 letters, a single substitution ("pui" -> "pur") links unrelated
 * words. Same-length matches must therefore be a swap of the same letters.
 */
const isLooseShortMatch = (query: string, candidate: string): boolean =>
  query.length === 3 &&
  candidate.length === 3 &&
  sortedLetters(query) !== sortedLetters(candidate);

/**
 * Similarity of one query token to one food token, 0..1:
 * exact 1 > prefix ~0.9 > substring 0.7 > typo 0.6/0.5 > typo on the prefix 0.5/0.4.
 */
function scoreToken(query: string, candidate: string): number {
  if (candidate === query) return 1;
  if (candidate.startsWith(query)) return 0.85 + 0.1 * (query.length / candidate.length);

  const qLen = query.length;
  if (qLen < 3) return 0;
  if (candidate.includes(query)) return 0.7;

  const maxEdits = allowedEdits(qLen);
  const full = levenshteinDistance(query, candidate, maxEdits);
  if (full <= maxEdits && !isLooseShortMatch(query, candidate)) return 0.6 - 0.1 * (full - 1);

  // Typos on a word the user is still typing; too noisy for very short queries.
  if (qLen >= 4 && candidate.length > qLen) {
    const onPrefix = levenshteinDistance(query, candidate.slice(0, qLen), maxEdits);
    if (onPrefix <= maxEdits) return 0.5 - 0.1 * (onPrefix - 1);
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Database & index
// ---------------------------------------------------------------------------

interface IndexedFood {
  food: FoodItem;
  normalizedName: string;
  nameTokens: string[];
  aliasTokens: string[];
}

const isFoodItem = (value: unknown): value is FoodItem => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const numeric = (key: string): boolean => typeof v[key] === "number" && Number.isFinite(v[key] as number);
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    v.name.trim().length > 0 &&
    FOOD_CATEGORIES.includes(v.category as FoodCategory) &&
    typeof v.unit === "string" &&
    numeric("servingGrams") &&
    numeric("defaultPortion") &&
    numeric("calories") &&
    numeric("protein") &&
    numeric("carbs") &&
    numeric("fats") &&
    numeric("fiber")
  );
};

let foodIndex: IndexedFood[] | null = null;

function getFoodIndex(): IndexedFood[] {
  if (foodIndex) return foodIndex;

  const rawLocalFoods: unknown = foodsJson;
  const localFoods = Array.isArray(rawLocalFoods) ? rawLocalFoods.filter(isFoodItem) : [];

  const byId = new Map<string, FoodItem>();
  for (const food of [...localFoods, ...BODYBUILDING_FOOD_DATABASE]) {
    if (!byId.has(food.id)) byId.set(food.id, food);
  }

  foodIndex = [...byId.values()].map((food) => ({
    food,
    normalizedName: normalizeText(food.name),
    nameTokens: tokenize(food.name),
    aliasTokens: (food.aliases ?? []).flatMap(tokenize),
  }));
  return foodIndex;
}

/** Builds the index ahead of the first keystroke (cheap, optional). */
export function warmUpFoodIndex(): void {
  getFoodIndex();
}

function scoreFood(entry: IndexedFood, queryTokens: string[], normalizedQuery: string): number {
  let total = 0;
  for (const token of queryTokens) {
    let best = 0;
    for (const candidate of entry.nameTokens) {
      const score = scoreToken(token, candidate);
      if (score > best) best = score;
    }
    for (const candidate of entry.aliasTokens) {
      const score = scoreToken(token, candidate) * 0.95;
      if (score > best) best = score;
    }
    if (best < MIN_TOKEN_SCORE) return 0;
    total += best;
  }

  const average = total / queryTokens.length;
  return entry.normalizedName.startsWith(normalizedQuery) ? average + 0.08 : average;
}

/**
 * Typo-tolerant search over the offline food database.
 *
 * - Empty query: returns every food (optionally filtered by category), in database order.
 * - Otherwise: foods ranked by relevance, best first, at most `limit` (default 30).
 *   Every word of the query must match some word of the food name or its aliases,
 *   exactly, as a prefix, or within a couple of typos.
 *
 * Examples: "orez" -> Orez basmati, Orez brun; "piu" / "puio" -> Piept de pui.
 */
export function searchFoodsOffline(query: string, options: FoodSearchOptions = {}): FoodItem[] {
  const { category, limit = DEFAULT_LIMIT } = options;
  const candidates = getFoodIndex().filter((entry) => !category || entry.food.category === category);

  const normalizedQuery = normalizeText(typeof query === "string" ? query : "");
  if (normalizedQuery === "") return candidates.map((entry) => entry.food);

  const queryTokens = tokenize(normalizedQuery);
  const max = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_LIMIT;

  return candidates
    .map((entry) => ({ entry, score: scoreFood(entry, queryTokens, normalizedQuery) }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.entry.food.name.length - b.entry.food.name.length ||
        a.entry.food.name.localeCompare(b.entry.food.name, "ro")
    )
    .slice(0, max)
    .map(({ entry }) => entry.food);
}

// ---------------------------------------------------------------------------
// Free-text meal parsing (offline fallback for the AI meal logger)
// ---------------------------------------------------------------------------

const QUANTITY_PATTERN = /(\d+(?:[.,]\d+)?)\s*(kg|gr|grame|gram|g|ml|l)\b/i;

/** Comma / semicolon / newline / "+" / "și" / "plus" always split; "cu" only before a quantity or article. */
const SEGMENT_SEPARATOR = /[,;\n+]+|\s+(?:și|si|plus)\s+|\s+cu\s+(?=\d|o\s|un\s|una\s)/i;

const UNIT_GRAMS: ReadonlyArray<{ pattern: RegExp; grams: number; dropFromName: boolean }> = [
  { pattern: /\blingur(?:a|i)\b/, grams: 14, dropFromName: true },
  { pattern: /\bfel(?:ie|ii)\b/, grams: 35, dropFromName: true },
  { pattern: /\b(?:scoop|cupa|masura)\b/, grams: 30, dropFromName: true },
  { pattern: /\b(?:oua|ou)\b/, grams: 55, dropFromName: false },
  { pattern: /\bbanan(?:a|e)\b/, grams: 120, dropFromName: false },
  { pattern: /\b(?:mar|mere)\b/, grams: 150, dropFromName: false },
];

const COUNT_WORDS: Readonly<Record<string, number>> = { o: 1, un: 1, una: 1, doua: 2, trei: 3, patru: 4, cinci: 5 };
const NAME_FILLER: ReadonlySet<string> = new Set(["de", "din", "la", "cu", "si", "in", "pe", "a", ...Object.keys(COUNT_WORDS)]);

interface ExtraFood {
  keys: readonly string[];
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

/** Common foods missing from the bundled databases (per 100 g). */
const EXTRA_FOODS: readonly ExtraFood[] = [
  { keys: ["cascaval"], name: "Cașcaval", calories: 350, protein: 25, carbs: 1.3, fats: 27, fiber: 0 },
  { keys: ["mozzarella"], name: "Mozzarella", calories: 280, protein: 28, carbs: 3, fats: 17, fiber: 0 },
  { keys: ["unt"], name: "Unt", calories: 717, protein: 0.9, carbs: 0.1, fats: 81, fiber: 0 },
  { keys: ["ulei"], name: "Ulei de măsline", calories: 884, protein: 0, carbs: 0, fats: 100, fiber: 0 },
  { keys: ["banana"], name: "Banană", calories: 89, protein: 1.1, carbs: 22.8, fats: 0.3, fiber: 2.6 },
];

const GENERIC_FOOD_PER_100G = { calories: 180, protein: 15, carbs: 18, fats: 5, fiber: 2 } as const;

export function splitMealSegments(text: string): string[] {
  return text
    .split(SEGMENT_SEPARATOR)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

/** How many separate foods in the text carry an explicit weight/volume ("60g pui, 25g cașcaval" -> 2). */
export function countQuantifiedFoods(text: string): number {
  return splitMealSegments(text).filter((segment) => QUANTITY_PATTERN.test(segment)).length;
}

interface ParsedSegment {
  name: string;
  grams: number | null;
}

function parseMealSegment(raw: string): ParsedSegment | null {
  let grams: number | null = null;
  let rest = raw;

  const quantity = QUANTITY_PATTERN.exec(raw);
  if (quantity) {
    const value = parseFloat(quantity[1].replace(",", "."));
    const unit = quantity[2].toLowerCase();
    grams = unit === "kg" || unit === "l" ? value * 1000 : value;
    rest = raw.replace(quantity[0], " ");
  }

  const normalized = normalizeText(rest);
  const dropped = new Set<string>();

  if (grams === null) {
    const unit = UNIT_GRAMS.find(({ pattern }) => pattern.test(normalized));
    if (unit) {
      const explicitCount = /\b(\d+)\b/.exec(normalized);
      const wordCount = normalized.split(" ").find((token) => token in COUNT_WORDS);
      const count = explicitCount ? Number(explicitCount[1]) : wordCount ? COUNT_WORDS[wordCount] : 1;
      grams = Math.max(1, count) * unit.grams;
      if (unit.dropFromName) {
        const match = unit.pattern.exec(normalized);
        if (match) dropped.add(match[0]);
      }
    }
  }

  const name = normalized
    .split(" ")
    .filter((token) => token && !/^\d+$/.test(token) && !NAME_FILLER.has(token) && !dropped.has(token))
    .join(" ");

  if (!name) return null;
  return { name, grams: grams !== null && Number.isFinite(grams) && grams > 0 ? Math.round(grams) : null };
}

const toTitleCase = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Full phrase first, then word by word ("ouă fierte" -> "ouă"), so descriptors never block a match. */
function findFoodForName(name: string): FoodItem | undefined {
  const exact = searchFoodsOffline(name, { limit: 1 })[0];
  if (exact) return exact;
  for (const token of name.split(" ")) {
    if (token.length < 3) continue;
    const hit = searchFoodsOffline(token, { limit: 1 })[0];
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Splits a sentence such as "60g pui, 25g cașcaval, 55g pâine" into one item per food,
 * using the offline databases for macros. Returns an empty array when nothing is recognised.
 */
export function parseMealTextOffline(text: string, category: MealSlotCategory): MacroMealItem[] {
  const time = new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  const stamp = Date.now();
  const items: MacroMealItem[] = [];

  splitMealSegments(text).forEach((segment, index) => {
    const parsed = parseMealSegment(segment);
    if (!parsed) return;

    const nameTokens = parsed.name.split(" ");
    const dbFood = findFoodForName(parsed.name);
    const extra = dbFood ? undefined : EXTRA_FOODS.find(({ keys }) => keys.some((key) => nameTokens.includes(key)));

    const per100 = dbFood ?? extra ?? GENERIC_FOOD_PER_100G;
    const label = dbFood?.name ?? extra?.name ?? `${toTitleCase(parsed.name)} (estimat)`;
    const grams = parsed.grams ?? (dbFood ? dbFood.defaultPortion : 100);
    const factor = grams / 100;

    items.push({
      id: `nlp_${stamp}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${label} (${grams}g)`,
      category,
      grams,
      calories: Math.round(per100.calories * factor),
      protein: Number((per100.protein * factor).toFixed(1)),
      carbs: Number((per100.carbs * factor).toFixed(1)),
      fats: Number((per100.fats * factor).toFixed(1)),
      fiber: Number((per100.fiber * factor).toFixed(1)),
      time,
    });
  });

  return items;
}

// ---------------------------------------------------------------------------
// Strict offline parsing (used when the AI is unavailable)
// ---------------------------------------------------------------------------

/**
 * Exact-word lookup: every word of the phrase must be a word of the food's name or aliases, and at
 * least one must come from the name itself. No typo tolerance and no dropped descriptors, so
 * "pastrav" never becomes "Castraveți" and "creveți prăjiți în ulei" never becomes "Creveți (cruzi)".
 */
function findConfidentFood(name: string): FoodItem | undefined {
  const queryTokens = tokenize(name);
  if (queryTokens.length === 0) return undefined;

  let best: IndexedFood | undefined;
  for (const entry of getFoodIndex()) {
    const known = new Set([...entry.nameTokens, ...entry.aliasTokens]);
    if (!queryTokens.every((token) => known.has(token))) continue;
    if (!queryTokens.some((token) => entry.nameTokens.includes(token))) continue;

    const moreSpecific =
      !best ||
      entry.nameTokens.length < best.nameTokens.length ||
      (entry.nameTokens.length === best.nameTokens.length && entry.food.name.length < best.food.name.length);
    if (moreSpecific) best = entry;
  }
  return best?.food;
}

function findConfidentExtraFood(name: string): ExtraFood | undefined {
  const queryTokens = tokenize(name);
  if (queryTokens.length === 0) return undefined;
  return EXTRA_FOODS.find((extra) => {
    const known = new Set([...extra.keys, ...tokenize(extra.name)]);
    return queryTokens.every((token) => known.has(token));
  });
}

/**
 * Like {@link parseMealTextOffline}, but all-or-nothing: returns the items only when EVERY food in the
 * text was matched exactly against the bundled databases. Returns null as soon as one food is unknown
 * or carries a descriptor the database cannot represent (cooking method, brand, ...), so the caller can
 * tell the user that smart processing is needed instead of showing invented numbers.
 */
export function parseMealTextConfident(text: string, category: MealSlotCategory): MacroMealItem[] | null {
  const segments = splitMealSegments(text);
  if (segments.length === 0) return null;

  const time = new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  const stamp = Date.now();
  const items: MacroMealItem[] = [];

  for (const [index, segment] of segments.entries()) {
    const parsed = parseMealSegment(segment);
    if (!parsed) return null;

    // Generic staples first: "unt" must be butter, not the database's "Unt de arahide".
    const extra = findConfidentExtraFood(parsed.name);
    const dbFood = extra ? undefined : findConfidentFood(parsed.name);
    const per100 = dbFood ?? extra;
    if (!per100) return null;

    const label = dbFood?.name ?? extra?.name ?? parsed.name;
    const grams = parsed.grams ?? (dbFood ? dbFood.defaultPortion : 100);
    const factor = grams / 100;

    items.push({
      id: `nlp_${stamp}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${label} (${grams}g)`,
      category,
      grams,
      calories: Math.round(per100.calories * factor),
      protein: Number((per100.protein * factor).toFixed(1)),
      carbs: Number((per100.carbs * factor).toFixed(1)),
      fats: Number((per100.fats * factor).toFixed(1)),
      fiber: Number((per100.fiber * factor).toFixed(1)),
      time,
    });
  }

  return items;
}
