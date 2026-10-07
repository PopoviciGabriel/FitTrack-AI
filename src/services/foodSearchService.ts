import foodsJson from "../data/foods.json";
import { BODYBUILDING_FOOD_DATABASE } from "../data/foodDatabase";
import { NON_CALORIC_KEYS, ROMANIAN_FOOD_DICTIONARY } from "../data/romanianFoodDictionary";
import {
  CookingMethod,
  DictionaryFood,
  DictionaryFoodGroup,
  FoodCategory,
  FoodItem,
  FoodSearchOptions,
  MacroMealItem,
  MacroTotals,
  MealSlotCategory,
  SmartFoodMatch,
  SmartParseOptions,
  SmartTextParse,
} from "../types";

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

// ---------------------------------------------------------------------------
// FitTrack Smart Engine: heuristic offline meal parser
// ---------------------------------------------------------------------------

type UnitKind =
  | "mass"
  | "volume"
  | "spoon"
  | "teaspoon"
  | "cup"
  | "glass"
  | "slice"
  | "piece"
  | "portion"
  | "handful"
  | "scoop"
  | "scoopOrCup"
  | "bowl"
  | "can"
  | "clove";

interface UnitWord {
  kind: UnitKind;
  /** Grams or millilitres per unit for "mass" / "volume". */
  factor: number;
}

const unitWord = (kind: UnitKind, factor = 1): UnitWord => ({ kind, factor });

const UNIT_WORDS: Readonly<Record<string, UnitWord>> = {
  g: unitWord("mass"), gr: unitWord("mass"), gram: unitWord("mass"), grame: unitWord("mass"), grams: unitWord("mass"),
  kg: unitWord("mass", 1000), kilogram: unitWord("mass", 1000), kilograme: unitWord("mass", 1000),
  ml: unitWord("volume"), mililitri: unitWord("volume"), l: unitWord("volume", 1000), litru: unitWord("volume", 1000),
  litri: unitWord("volume", 1000), dl: unitWord("volume", 100), cl: unitWord("volume", 10),
  lingura: unitWord("spoon"), linguri: unitWord("spoon"), tbsp: unitWord("spoon"),
  lingurita: unitWord("teaspoon"), lingurite: unitWord("teaspoon"), tsp: unitWord("teaspoon"),
  cana: unitWord("cup"), cani: unitWord("cup"), ceasca: unitWord("cup"), cesti: unitWord("cup"), cup: unitWord("cup"), cups: unitWord("cup"),
  pahar: unitWord("glass"), pahare: unitWord("glass"), glass: unitWord("glass"),
  felie: unitWord("slice"), felii: unitWord("slice"), feliuta: unitWord("slice"), feliute: unitWord("slice"),
  slice: unitWord("slice"), slices: unitWord("slice"),
  bucata: unitWord("piece"), bucati: unitWord("piece"), buc: unitWord("piece"), bucatica: unitWord("piece"),
  bucatele: unitWord("piece"), piece: unitWord("piece"), pieces: unitWord("piece"),
  portie: unitWord("portion"), portii: unitWord("portion"), portia: unitWord("portion"), serving: unitWord("portion"),
  pumn: unitWord("handful"), pumni: unitWord("handful"), mana: unitWord("handful"), handful: unitWord("handful"),
  scoop: unitWord("scoop"), scoopuri: unitWord("scoop"), masura: unitWord("scoop"), masuri: unitWord("scoop"),
  cupa: unitWord("scoopOrCup"), cupe: unitWord("scoopOrCup"),
  bol: unitWord("bowl"), boluri: unitWord("bowl"), castron: unitWord("bowl"), castronel: unitWord("bowl"),
  farfurie: unitWord("bowl"), farfurii: unitWord("bowl"), bowl: unitWord("bowl"), plate: unitWord("bowl"),
  conserva: unitWord("can"), conserve: unitWord("can"), cutie: unitWord("can"), cutii: unitWord("can"),
  doza: unitWord("can"), doze: unitWord("can"), can: unitWord("can"),
  catel: unitWord("clove"), catei: unitWord("clove"),
};

const SMART_COUNT_WORDS: Readonly<Record<string, number>> = {
  o: 1, un: 1, una: 1, unu: 1, doua: 2, doi: 2, trei: 3, patru: 4, cinci: 5, sase: 6, sapte: 7, opt: 8, noua: 9, zece: 10,
  cateva: 3, cativa: 3, one: 1, two: 2, three: 3,
};

const FRACTION_WORDS: Readonly<Record<string, number>> = { jumatate: 0.5, jumatati: 0.5, juma: 0.5, half: 0.5, sfert: 0.25, sferturi: 0.25 };

/** Words that describe the meal or the eater, never a food. Matched exactly only (no typo tolerance). */
const DESCRIPTOR_WORDS: ReadonlySet<string> = new Set([
  "de", "din", "la", "cu", "si", "in", "pe", "a", "al", "ale", "ai", "cel", "cea", "cei", "cele", "am", "au", "mi", "ma", "imi",
  "mancat", "mancare", "mancarea", "baut", "avut", "luat", "facut", "pregatit", "azi", "astazi", "ieri", "dimineata",
  "pranz", "pranzul", "seara", "cina", "cinei", "dejun", "mic", "gustare", "gustarea", "masa", "mesei", "pentru", "vreau", "as", "vrea",
  "doar", "cam", "aproximativ", "aprox", "circa", "vreo", "putin", "putina", "niste", "ceva", "pic", "foarte", "bine", "mult", "multa",
  "fara", "piele", "os", "oase", "proaspat", "proaspata", "proaspeti", "proaspete", "bio", "eco", "slab", "slaba", "slabe", "light",
  "mare", "mari", "mica", "medie", "mediu", "mijlocie", "mijlociu", "normal", "normala", "total", "frigider", "acasa", "rapid", "rapida",
  "post", "pre", "workout", "antrenament", "dupa", "inainte", "plus", "apoi", "iar", "sau", "tot", "toata", "intreg", "intreaga",
  "kcal", "calorii", "proteine", "carbohidrati", "carbo", "grasimi", "fibre", "macro", "macros", "anabolic", "anabolica", "sanatos",
  "sanatoasa", "the", "and", "with", "of", "an", "some", "ate", "had", "for", "breakfast", "lunch", "dinner", "snack", "x",
]);

const METHOD_PATTERNS: ReadonlyArray<{ method: CookingMethod; phrases: readonly string[] }> = [
  { method: "breaded", phrases: ["pane", "panat", "panata", "panati", "panate", "in pesmet", "breaded"] },
  { method: "airfried", phrases: ["air fryer", "airfryer", "friteuza cu aer", "friteuza"] },
  { method: "fried", phrases: ["prajit", "prajita", "prajiti", "prajite", "in ulei", "fried", "ochiuri"] },
  { method: "grilled", phrases: ["la gratar", "gratar", "grill", "grilled", "grilat", "grilata", "grilati", "grilate", "bbq", "frigarui"] },
  { method: "baked", phrases: ["la cuptor", "cuptor", "copt", "coapta", "copti", "coapte", "baked", "roasted", "rumenit", "rumenita", "rumeniti"] },
  { method: "pan", phrases: ["la tigaie", "tigaie", "sotat", "sotata", "sotati", "sotate", "omleta", "sauteed"] },
  { method: "steamed", phrases: ["la abur", "abur", "aburit", "aburite", "steamed"] },
  {
    method: "boiled",
    phrases: ["fiert", "fiarta", "fierti", "fierte", "boiled", "gatit", "gatita", "gatiti", "gatite", "inabusit", "inabusite", "gata preparat"],
  },
  { method: "smoked", phrases: ["afumat", "afumata", "afumati", "afumate", "smoked"] },
  { method: "raw", phrases: ["crud", "cruda", "cruzi", "crude", "raw"] },
];

const METHOD_TOKENS: ReadonlySet<string> = new Set(
  METHOD_PATTERNS.flatMap(({ phrases }) => phrases.flatMap((phrase) => phrase.split(" "))).filter((token) => token !== "ulei")
);

const METHOD_PRIORITY = new Map<CookingMethod, number>(METHOD_PATTERNS.map(({ method }, index) => [method, index]));

/** Groups whose values depend on how they were cooked; for the rest cooking words are ignored. */
const METHOD_SENSITIVE_GROUPS: ReadonlySet<DictionaryFoodGroup> = new Set([
  "pasare", "carne_rosie", "peste", "fructe_mare", "oua", "cereale", "leguminoase", "cartofi", "legume", "branzeturi",
]);

/** Raw-to-cooked weight yield: 100 g of grilled chicken was ~133 g raw. */
const COOKED_YIELD: Partial<Record<DictionaryFoodGroup, number>> = { pasare: 0.75, carne_rosie: 0.72, peste: 0.8, fructe_mare: 0.8 };

const OIL_ABSORBING_GROUPS: ReadonlySet<DictionaryFoodGroup> = new Set(["cartofi", "legume"]);

/** When one of these is listed separately, frying oil is not counted a second time inside the fried food. */
const ADDED_FAT_IDS: ReadonlySet<string> = new Set(["ulei-masline", "ulei", "unt", "untura", "margarina"]);

const AGREEING_METHOD_LABELS: Partial<Record<CookingMethod, Readonly<Record<DictionaryFood["form"], string>>>> = {
  raw: { m: "crud", f: "crudă", mpl: "cruzi", fpl: "crude" },
  boiled: { m: "fiert", f: "fiartă", mpl: "fierți", fpl: "fierte" },
  fried: { m: "prăjit", f: "prăjită", mpl: "prăjiți", fpl: "prăjite" },
  smoked: { m: "afumat", f: "afumată", mpl: "afumați", fpl: "afumate" },
};

const FIXED_METHOD_LABELS: Partial<Record<CookingMethod, string>> = {
  steamed: "la abur",
  grilled: "la grătar",
  baked: "la cuptor",
  pan: "la tigaie",
  breaded: "pane",
  airfried: "la air fryer",
};

/** Splits on punctuation and on conjunctions, but keeps "2 și jumătate" together. */
const SMART_SEGMENT_SEPARATOR =
  /[,;\n+!?:]+|\.(?!\d)|\s+(?:si(?!\s+(?:o\s+)?jumatate\b)|plus|cu|sau|apoi|iar|alaturi de|impreuna cu|precum si)\s+/g;

interface ParsedQuantity {
  amount: number;
  unit: UnitWord | null;
}

interface KeyEntry {
  /** null for recognized non-caloric items (water, salt, spices). */
  food: DictionaryFood | null;
  tokens: readonly string[];
}

interface SpanMatch {
  food: DictionaryFood | null;
  start: number;
  end: number;
  score: number;
}

interface SmartSegment {
  display: string;
  tokens: string[];
}

interface PersonalFoodEntry {
  label: string;
  tokens: string[];
  per100: MacroTotals;
  portion: number;
}

type GramsProfile = Pick<DictionaryFood, "portion" | "pieceGrams" | "sliceGrams" | "spoonGrams" | "cupGrams" | "canGrams" | "density" | "cookedFactor"> & {
  group?: DictionaryFoodGroup;
};

interface ResolvedGrams {
  grams: number;
  explicit: boolean;
  impliedMethod: CookingMethod | null;
}

let keyIndex: KeyEntry[] | null = null;

function getKeyIndex(): KeyEntry[] {
  if (!keyIndex) {
    keyIndex = [
      ...ROMANIAN_FOOD_DICTIONARY.flatMap((food) => food.keys.map((key) => ({ food, tokens: key.split(" ") }))),
      ...NON_CALORIC_KEYS.map((key) => ({ food: null, tokens: key.split(" ") })),
    ];
  }
  return keyIndex;
}

let protectedPhrases: ReadonlyArray<{ pattern: RegExp; replacement: string }> | null = null;

/** Food names containing a separator word ("cafea cu lapte") must survive segmentation. */
function getProtectedPhrases(): ReadonlyArray<{ pattern: RegExp; replacement: string }> {
  if (!protectedPhrases) {
    protectedPhrases = ROMANIAN_FOOD_DICTIONARY.flatMap((food) => food.keys)
      .filter((key) => / (?:cu|si) /.test(key))
      .map((key) => ({
        pattern: new RegExp(`(?<![a-z0-9])${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "g"),
        replacement: key.replace(/ /g, "_"),
      }));
  }
  return protectedPhrases;
}

function parseNumberToken(token: string | undefined): number | null {
  if (!token) return null;
  if (/^\d+(?:\.\d+)?$/.test(token)) return Number(token);
  const fraction = /^(\d+)\/(\d+)$/.exec(token);
  if (fraction && Number(fraction[2]) > 0) return Number(fraction[1]) / Number(fraction[2]);
  return null;
}

/** Diacritics-free, lowercase tokens; "200g" -> "200 g", "½" -> "1/2", "2-3" -> "2.5", "2%" -> "2procent". */
function prepareSegmentTokens(raw: string): string[] {
  return raw
    .replace(/½/g, " 1/2 ")
    .replace(/¼/g, " 1/4 ")
    .replace(/¾/g, " 3/4 ")
    .replace(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/g, (_match, a: string, b: string) => ` ${(Number(a) + Number(b)) / 2} `)
    .replace(/(\d+(?:\.\d+)?)\s+si\s+(?:o\s+)?jumatate\b/g, (_match, a: string) => ` ${Number(a) + 0.5} `)
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/(\d+(?:\.\d+)?)\s*%/g, " $1procent ")
    .replace(/_/g, " ")
    .replace(/[^a-z0-9./ ]+/g, " ")
    .split(/\s+/)
    .flatMap((token) => (token.includes("/") && !/^\d+\/\d+$/.test(token) ? token.split("/") : [token]))
    .map((token) => token.replace(/^\.+|\.+$/g, ""))
    .filter(Boolean);
}

/**
 * Segment boundaries are found on a diacritics-free copy that keeps the original's character positions,
 * so unrecognized fragments can be reported in the user's own spelling.
 */
function splitSmartSegments(text: string): SmartSegment[] {
  const original = text.normalize("NFC").replace(/(\d),(\d)/g, "$1.$2");
  let base = original.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const aligned = base.length === original.length;
  for (const { pattern, replacement } of getProtectedPhrases()) base = base.replace(pattern, replacement);

  // A short heading before ":" ("Shake proteic: 40g whey, ...") names the meal, it is not a food.
  const colon = base.indexOf(":");
  const offset = colon > 0 && base.slice(0, colon).trim().split(/\s+/).length <= 4 ? colon + 1 : 0;

  const segments: SmartSegment[] = [];
  const push = (start: number, end: number) => {
    const raw = base.slice(start, end);
    const tokens = prepareSegmentTokens(raw);
    if (tokens.length === 0) return;
    segments.push({ display: (aligned ? original.slice(start, end) : raw.replace(/_/g, " ")).trim(), tokens });
  };

  let cursor = offset;
  for (const match of base.slice(offset).matchAll(SMART_SEGMENT_SEPARATOR)) {
    const start = offset + (match.index ?? 0);
    push(cursor, start);
    cursor = start + match[0].length;
  }
  push(cursor, base.length);
  return segments;
}

/**
 * 1 exact, 0.92 inflected ("cartofii", "rosiile"), 0.9 truncated ("banan"), 0.8 one or two typos
 * on long words with the same first letter. Descriptor words never fuzzy-match ("proteine" is not whey).
 */
function tokenSimilarity(input: string, key: string): number {
  if (input === key) return 1;
  if (DESCRIPTOR_WORDS.has(input) || /\d/.test(input)) return 0;
  if (key.length >= 4 && input.startsWith(key) && input.length - key.length <= 3) return 0.92;
  if (input.length >= 5 && key.startsWith(input) && key.length - input.length === 1) return 0.9;
  if (input.length >= 5 && key.length >= 5 && input[0] === key[0]) {
    const maxEdits = input.length >= 8 ? 2 : 1;
    if (levenshteinDistance(input, key, maxEdits) <= maxEdits) return 0.8;
  }
  return 0;
}

/** Longest, best-scoring non-overlapping dictionary phrases ("unt de arahide" beats "unt"). */
function findDictionarySpans(tokens: string[]): SpanMatch[] {
  const candidates: SpanMatch[] = [];
  for (const entry of getKeyIndex()) {
    const length = entry.tokens.length;
    for (let start = 0; start + length <= tokens.length; start++) {
      // "peste 45g" is the preposition "over", not fish.
      if (entry.tokens[0] === "peste" && parseNumberToken(tokens[start + 1]) !== null) continue;
      let score = 0;
      for (let k = 0; k < length; k++) {
        const similarity = tokenSimilarity(tokens[start + k], entry.tokens[k]);
        if (similarity === 0) {
          score = 0;
          break;
        }
        score += similarity;
      }
      if (score > 0) candidates.push({ food: entry.food, start, end: start + length, score: score * 10 + length });
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.start - b.start);
  const taken = new Array<boolean>(tokens.length).fill(false);
  const selected: SpanMatch[] = [];
  for (const candidate of candidates) {
    let free = true;
    for (let i = candidate.start; i < candidate.end; i++) {
      if (taken[i]) {
        free = false;
        break;
      }
    }
    if (!free) continue;
    for (let i = candidate.start; i < candidate.end; i++) taken[i] = true;
    selected.push(candidate);
  }
  return selected.sort((a, b) => a.start - b.start);
}

/** The last contiguous quantity in the window wins: "am mâncat cam 200 g de" -> 200 g. */
function parseQuantityWindow(tokens: readonly string[]): ParsedQuantity | null {
  let amount: number | null = null;
  let unit: UnitWord | null = null;
  for (const token of tokens) {
    const value = parseNumberToken(token);
    if (value !== null) {
      if (amount !== null && unit === null && value < 1) amount += value;
      else {
        amount = value;
        unit = null;
      }
      continue;
    }
    if (token in SMART_COUNT_WORDS) {
      amount = SMART_COUNT_WORDS[token];
      unit = null;
      continue;
    }
    if (token in FRACTION_WORDS) {
      amount = (amount ?? 1) * FRACTION_WORDS[token];
      continue;
    }
    const word = UNIT_WORDS[token];
    if (word) {
      unit = word;
      if (amount === null) amount = 1;
    }
  }
  return amount === null || !(amount > 0) ? null : { amount, unit };
}

const clampGrams = (grams: number): number => Math.min(5000, Math.max(1, Math.round(grams)));

function resolveGrams(quantity: ParsedQuantity | null, profile: GramsProfile): ResolvedGrams {
  if (!quantity) return { grams: profile.portion, explicit: false, impliedMethod: null };

  const n = quantity.amount;
  const unit = quantity.unit;
  const liquid = profile.density ?? 1;
  const cup = profile.cupGrams ?? (profile.density ? 250 * profile.density : 200);
  let grams: number;
  let impliedMethod: CookingMethod | null = null;

  switch (unit?.kind) {
    case "mass":
      grams = n * unit.factor;
      break;
    case "volume":
      grams = n * unit.factor * liquid;
      break;
    case "spoon":
      grams = n * (profile.spoonGrams ?? 15 * liquid);
      break;
    case "teaspoon":
      grams = (n * (profile.spoonGrams ?? 15 * liquid)) / 3;
      break;
    case "cup":
      grams = n * cup;
      break;
    case "scoopOrCup":
      grams = n * (profile.group === "suplimente" ? 30 : cup);
      break;
    case "scoop":
      grams = n * (profile.group === "suplimente" ? 30 : (profile.spoonGrams ?? 10) * 3);
      break;
    case "glass":
      grams = n * 200 * liquid;
      break;
    case "slice":
      grams = n * (profile.sliceGrams ?? 30);
      break;
    case "piece":
      grams = n * (profile.pieceGrams ?? profile.portion);
      break;
    case "portion":
      grams = n * profile.portion;
      break;
    case "handful":
      grams = n * (profile.group === "nuci" ? 30 : 50);
      break;
    case "bowl":
      // A bowl of rice or pasta is cooked food, not 250 g of dry grains.
      if (profile.cookedFactor !== undefined) {
        grams = n * 250;
        impliedMethod = "boiled";
      } else if (profile.group === "cereale") {
        grams = n * profile.portion * 1.5;
      } else {
        grams = n * Math.max(profile.portion, 250);
      }
      break;
    case "can":
      grams = n * (profile.canGrams ?? 150);
      break;
    case "clove":
      grams = n * 5;
      break;
    default:
      // Bare number: a count for countable foods ("3 ouă"), otherwise grams ("200 pui").
      if (profile.pieceGrams !== undefined) grams = n <= 30 ? n * profile.pieceGrams : n;
      else grams = n < 10 ? n * profile.portion : n;
  }

  return { grams: clampGrams(grams), explicit: true, impliedMethod };
}

function adjustPer100(food: DictionaryFood, method: CookingMethod | null, separateFat: boolean): MacroTotals {
  const base: MacroTotals = { calories: food.calories, protein: food.protein, carbs: food.carbs, fats: food.fats, fiber: food.fiber };
  if (food.prepared || method === null || method === "raw" || !METHOD_SENSITIVE_GROUPS.has(food.group)) return base;

  const cookedYield = COOKED_YIELD[food.group];
  let scale = 1;
  if (cookedYield !== undefined) scale = 1 / cookedYield;
  else if (food.cookedFactor !== undefined && (method === "boiled" || method === "steamed")) scale = food.cookedFactor;
  else if (OIL_ABSORBING_GROUPS.has(food.group) && (method === "baked" || method === "grilled" || method === "airfried")) scale = 1.15;

  let addedFat = 0;
  let addedCarbs = 0;
  let addedProtein = 0;
  if (method === "breaded") {
    addedFat = separateFat ? 4 : 12;
    addedCarbs = 12;
    addedProtein = 1.5;
  } else if (!separateFat) {
    if (method === "fried") addedFat = OIL_ABSORBING_GROUPS.has(food.group) ? 10 : food.group === "oua" ? 5 : 6;
    else if (method === "pan") addedFat = 3;
    else if (method === "airfried") addedFat = 1.5;
  }

  return {
    calories: food.calories * scale + 9 * addedFat + 4 * (addedCarbs + addedProtein),
    protein: food.protein * scale + addedProtein,
    carbs: food.carbs * scale + addedCarbs,
    fats: food.fats * scale + addedFat,
    fiber: food.fiber * scale,
  };
}

/** Dictionary name with the cooking method agreed in gender/number ("Ouă fierte", "Piept de pui la grătar"). */
export function formatFoodLabel(food: DictionaryFood, method: CookingMethod | null): string {
  if (method === null || food.prepared || !METHOD_SENSITIVE_GROUPS.has(food.group)) return food.name;
  if (method === "raw" && (food.group === "cereale" || food.group === "legume")) return food.name;
  const label = AGREEING_METHOD_LABELS[method]?.[food.form] ?? FIXED_METHOD_LABELS[method];
  return label ? `${food.name} ${label}` : food.name;
}

/** Builds a recognized food from a dictionary entry; also used to compose meals offline. */
export function createFoodMatch(
  food: DictionaryFood,
  grams: number,
  method: CookingMethod | null = null,
  options: { explicitQuantity?: boolean; separateFat?: boolean } = {}
): SmartFoodMatch {
  return {
    label: formatFoodLabel(food, method),
    group: food.group,
    dictionaryId: food.id,
    grams: clampGrams(grams),
    explicitQuantity: options.explicitQuantity ?? true,
    method,
    per100: adjustPer100(food, method, options.separateFat ?? false),
    source: "dictionary",
  };
}

/** Each cooking word belongs to the food right before it (Romanian adjectives follow the noun), else to the next one. */
function assignMethods(tokens: string[], spans: SpanMatch[]): (CookingMethod | null)[] {
  const methods: (CookingMethod | null)[] = spans.map(() => null);
  for (const { method, phrases } of METHOD_PATTERNS) {
    for (const phrase of phrases) {
      const phraseTokens = phrase.split(" ");
      for (let index = 0; index + phraseTokens.length <= tokens.length; index++) {
        if (!phraseTokens.every((token, k) => tokens[index + k] === token)) continue;

        let owner = spans.findIndex((span) => span.food !== null && span.start <= index && index < span.end);
        if (owner >= 0 && spans[owner].food?.prepared) continue;
        if (owner < 0) {
          for (let i = spans.length - 1; i >= 0; i--) {
            if (spans[i].food !== null && spans[i].end <= index) {
              owner = i;
              break;
            }
          }
        }
        if (owner < 0) owner = spans.findIndex((span) => span.food !== null && span.start > index);
        if (owner < 0) continue;

        const current = methods[owner];
        if (current === null || (METHOD_PRIORITY.get(method) ?? 99) < (METHOD_PRIORITY.get(current) ?? 99)) methods[owner] = method;
      }
    }
  }
  return methods;
}

function meaningfulTokens(tokens: readonly string[]): string[] {
  return tokens.filter(
    (token) =>
      token.length >= 3 &&
      parseNumberToken(token) === null &&
      !(token in UNIT_WORDS) &&
      !(token in SMART_COUNT_WORDS) &&
      !(token in FRACTION_WORDS) &&
      !DESCRIPTOR_WORDS.has(token) &&
      !METHOD_TOKENS.has(token) &&
      !token.endsWith("procent")
  );
}

function buildPersonalIndex(items: readonly MacroMealItem[]): PersonalFoodEntry[] {
  const seen = new Set<string>();
  const entries: PersonalFoodEntry[] = [];
  for (const item of items) {
    if (!(item.grams > 0) || !Number.isFinite(item.calories)) continue;
    const label = item.name.replace(/\s*\(\d+(?:[.,]\d+)?\s*g\)\s*$/i, "").trim();
    const dedupeKey = item.barcode ?? normalizeText(label);
    if (!label || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const tokens = meaningfulTokens(normalizeText(label).split(" "));
    if (tokens.length === 0) continue;
    const factor = 100 / item.grams;
    entries.push({
      label,
      tokens,
      portion: item.grams,
      per100: {
        calories: item.calories * factor,
        protein: item.protein * factor,
        carbs: item.carbs * factor,
        fats: item.fats * factor,
        fiber: (item.fiber ?? 0) * factor,
      },
    });
  }
  return entries;
}

function findPersonalFood(words: readonly string[], index: readonly PersonalFoodEntry[]): { entry: PersonalFoodEntry; matched: number } | null {
  let best: { entry: PersonalFoodEntry; matched: number } | null = null;
  for (const entry of index) {
    const matched = words.filter((word) => entry.tokens.some((token) => tokenSimilarity(word, token) >= 0.9)).length;
    if (matched > 0 && (!best || matched > best.matched)) best = { entry, matched };
  }
  return best;
}

const per100Of = (food: FoodItem): MacroTotals => ({
  calories: food.calories,
  protein: food.protein,
  carbs: food.carbs,
  fats: food.fats,
  fiber: food.fiber,
});

/**
 * FitTrack Smart Engine: turns a free-text Romanian/English meal description into individual foods, fully offline.
 * Understands quantities ("100g", "2 felii", "3 ouă", "o lingură", "250 ml", "jumătate de avocado"), cooking methods
 * (raw/boiled/grilled/fried/breaded...) and previously logged products. Unknown words are reported, never guessed.
 */
export function extractFoodsFromText(text: string, options: SmartParseOptions = {}): SmartTextParse {
  const segments = splitSmartSegments(typeof text === "string" ? text : "");
  const personalIndex = options.personalFoods?.length ? buildPersonalIndex(options.personalFoods) : [];
  const analysed = segments.map((segment) => ({ segment, spans: findDictionarySpans(segment.tokens) }));
  const separateFat = analysed.some(({ spans }) => spans.some((span) => span.food !== null && ADDED_FAT_IDS.has(span.food.id)));

  const foods: SmartFoodMatch[] = [];
  const unrecognized: string[] = [];

  for (const { segment, spans } of analysed) {
    const { tokens } = segment;
    const foodSpans = spans.filter((span) => span.food !== null);
    const words = meaningfulTokens(tokens);

    // A product the user already logged (e.g. scanned) wins when it names the food more precisely than the dictionary.
    const personal = personalIndex.length > 0 && foodSpans.length <= 1 ? findPersonalFood(words, personalIndex) : null;
    const dictionaryWords = foodSpans.length === 1 ? meaningfulTokens(tokens.slice(foodSpans[0].start, foodSpans[0].end)).length : 0;
    const usePersonal =
      personal !== null &&
      (foodSpans.length === 0 ? personal.matched * 2 >= words.length : personal.matched >= 2 && personal.matched > dictionaryWords);

    if (usePersonal && personal) {
      const { grams, explicit } = resolveGrams(parseQuantityWindow(tokens), { portion: personal.entry.portion });
      foods.push({
        label: personal.entry.label,
        grams,
        explicitQuantity: explicit,
        method: null,
        per100: personal.entry.per100,
        source: "personal",
      });
      continue;
    }

    if (foodSpans.length === 0) {
      // Recognized but calorie-free (water, salt, spices): nothing to log, nothing to report.
      if (spans.length > 0 && words.every((word) => spans.some((span) => tokens.slice(span.start, span.end).includes(word)))) continue;

      const dbFood =
        words.length > 0
          ? findConfidentFood(words.join(" ")) ?? words.filter((word) => word.length >= 4).map(findConfidentFood).find(Boolean)
          : undefined;
      if (dbFood) {
        const { grams, explicit } = resolveGrams(parseQuantityWindow(tokens), { portion: dbFood.defaultPortion });
        foods.push({ label: dbFood.name, grams, explicitQuantity: explicit, method: null, per100: per100Of(dbFood), source: "database" });
      } else if (words.length > 0) {
        unrecognized.push(segment.display);
      }
      continue;
    }

    const methods = assignMethods(tokens, spans);
    spans.forEach((span, index) => {
      const food = span.food;
      if (!food) return;
      const windowStart = index === 0 ? 0 : spans[index - 1].end;
      let quantity = parseQuantityWindow(tokens.slice(windowStart, span.start));
      if (!quantity && index === spans.length - 1) quantity = parseQuantityWindow(tokens.slice(span.end));

      const { grams, explicit, impliedMethod } = resolveGrams(quantity, food);
      const method = methods[index] ?? impliedMethod;
      foods.push(createFoodMatch(food, grams, method, { explicitQuantity: explicit, separateFat }));
    });
  }

  return { foods, unrecognized };
}

/** Converts a recognized food into a diary item with totals for its grams. */
export function smartMatchToMealItem(match: SmartFoodMatch, category: MealSlotCategory, index = 0): MacroMealItem {
  const factor = match.grams / 100;
  return {
    id: `smart_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
    name: `${match.label} (${match.grams}g)`,
    category,
    grams: match.grams,
    calories: Math.round(match.per100.calories * factor),
    protein: Number((match.per100.protein * factor).toFixed(1)),
    carbs: Number((match.per100.carbs * factor).toFixed(1)),
    fats: Number((match.per100.fats * factor).toFixed(1)),
    fiber: Number((match.per100.fiber * factor).toFixed(1)),
    time: new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }),
  };
}

/** Offline counterpart of the Gemini meal parser: one diary item per recognized food. */
export function parseMealTextSmart(
  text: string,
  category: MealSlotCategory,
  options: SmartParseOptions = {}
): { items: MacroMealItem[]; unrecognized: string[] } {
  const { foods, unrecognized } = extractFoodsFromText(text, options);
  return { items: foods.map((food, index) => smartMatchToMealItem(food, category, index)), unrecognized };
}

/** How many foods in the text carry an explicit quantity ("3 ouă, 2 felii de pâine" -> 2). */
export function countExplicitFoods(text: string): number {
  return extractFoodsFromText(text).foods.filter((food) => food.explicitQuantity).length;
}
