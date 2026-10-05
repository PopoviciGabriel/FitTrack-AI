import { LicenseActivationResult, LicenseInfo } from "../types";

export const LICENSE_STORAGE_KEY = "fittrack_pro_license";
export const FIRST_LAUNCH_STORAGE_KEY = "fittrack_first_launch_date";
export const LICENSE_STORE_URL = "#";
export const TRIAL_DURATION_DAYS = 7;
export const LICENSE_PRICE_RON = 20;
export const LICENSE_PRICE_LABEL = `${LICENSE_PRICE_RON} RON`;

const MS_PER_DAY = 86_400_000;
const LICENSE_KEY_PATTERN = /^FITPRO-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

type LicenseListener = (info: LicenseInfo) => void;
const listeners = new Set<LicenseListener>();

/** Fallback so the trial clock stays stable within a session if storage is unavailable. */
let firstLaunchInMemory: number | null = null;
let lastBroadcastSignature: string | null = null;

const normalizeKey = (raw: string): string => raw.trim().toUpperCase();

const readStoredKey = (): string | null => {
  try {
    return localStorage.getItem(LICENSE_STORAGE_KEY);
  } catch {
    return null;
  }
};

const readFirstLaunch = (): number | null => {
  try {
    const raw = localStorage.getItem(FIRST_LAUNCH_STORAGE_KEY);
    if (!raw) return null;
    const numeric = Number(raw);
    const timestamp = Number.isFinite(numeric) ? numeric : Date.parse(raw);
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
  } catch {
    return null;
  }
};

/** Returns the first-launch timestamp (ms), recording it on the very first call. */
const ensureFirstLaunch = (now: number): number => {
  const stored = readFirstLaunch();
  if (stored !== null) return stored;
  if (firstLaunchInMemory !== null) return firstLaunchInMemory;

  firstLaunchInMemory = now;
  try {
    localStorage.setItem(FIRST_LAUNCH_STORAGE_KEY, String(now));
  } catch {
    // storage unavailable: the in-memory value covers this session
  }
  return now;
};

const buildLicense = (key: string): LicenseInfo => ({
  isProUser: true,
  tier: "pro_lifetime",
  orderId: key,
  licenseKey: key,
  provider: "shopify",
  pricePaid: "Lifetime Access",
});

const buildTrialLicense = (now: number): LicenseInfo => {
  const firstLaunch = ensureFirstLaunch(now);
  const endsAt = firstLaunch + TRIAL_DURATION_DAYS * MS_PER_DAY;
  const remainingMs = endsAt - now;

  if (remainingMs <= 0) {
    return { isProUser: false, tier: "free", trialExpired: true, trialEndsAt: new Date(endsAt).toISOString() };
  }

  return {
    isProUser: true,
    tier: "trial",
    trialDaysLeft: Math.min(TRIAL_DURATION_DAYS, Math.ceil(remainingMs / MS_PER_DAY)),
    trialEndsAt: new Date(endsAt).toISOString(),
  };
};

const signatureOf = (info: LicenseInfo): string =>
  [info.tier, info.isProUser, info.trialDaysLeft ?? "", info.licenseKey ?? "", info.trialExpired ?? ""].join("|");

/** True when two license states would render the same UI. */
export const licensesEqual = (a: LicenseInfo, b: LicenseInfo): boolean => signatureOf(a) === signatureOf(b);

const notify = (info: LicenseInfo): void => {
  lastBroadcastSignature = signatureOf(info);
  listeners.forEach((fn) => fn(info));
};

export class PurchaseService {
  /**
   * Local format check. This is the single place to swap for a remote
   * Shopify validation later (the rest of the app only depends on the result).
   */
  static validateLicenseKey(rawKey: string): boolean {
    return LICENSE_KEY_PATTERN.test(normalizeKey(rawKey));
  }

  /**
   * Current access state, derived from storage:
   *  1. a valid license key           -> "pro_lifetime"
   *  2. fewer than 7 days since the first launch -> "trial" (full access)
   *  3. otherwise                      -> "free" with `trialExpired` (locked)
   * The first call on a fresh install records `fittrack_first_launch_date`.
   */
  static getLicense(now: number = Date.now()): LicenseInfo {
    const stored = readStoredKey();
    if (stored && PurchaseService.validateLicenseKey(stored)) {
      return buildLicense(normalizeKey(stored));
    }
    return buildTrialLicense(now);
  }

  /**
   * Subscribe to access changes. Notifies immediately with the current state.
   */
  static subscribe(listener: LicenseListener): () => void {
    listeners.add(listener);
    const current = PurchaseService.getLicense();
    lastBroadcastSignature ??= signatureOf(current);
    listener(current);
    return () => {
      listeners.delete(listener);
    };
  }

  /**
   * Re-evaluates time-dependent state (trial day count, expiry) and notifies
   * subscribers only if something changed. Safe to call as often as needed.
   */
  static refresh(now: number = Date.now()): LicenseInfo {
    const current = PurchaseService.getLicense(now);
    if (signatureOf(current) !== lastBroadcastSignature) notify(current);
    return current;
  }

  /** True when the app is usable (valid license or active trial). */
  static isPro(): boolean {
    return PurchaseService.getLicense().isProUser;
  }

  /**
   * Validate, persist and broadcast a license key.
   */
  static async activateLicense(rawKey: string): Promise<LicenseActivationResult> {
    const key = normalizeKey(rawKey);

    if (!key) {
      return { success: false, message: "Introdu codul de licență." };
    }

    if (!PurchaseService.validateLicenseKey(key)) {
      return {
        success: false,
        message: "Cod invalid. Formatul corect este FITPRO-XXXX-XXXX.",
      };
    }

    try {
      localStorage.setItem(LICENSE_STORAGE_KEY, key);
    } catch {
      return {
        success: false,
        message: "Nu am putut salva licența pe acest dispozitiv. Verifică setările browserului.",
      };
    }

    const license = buildLicense(key);
    notify(license);
    return { success: true, message: "Licență activată. Bun venit în FitTrack Pro!", license };
  }

  /**
   * Opens the store so the user can buy a lifetime license. Does not grant access.
   */
  static async checkout(
    _provider: "stripe" | "lemonsqueezy" | "google_play" = "stripe"
  ): Promise<LicenseActivationResult> {
    window.open(LICENSE_STORE_URL, "_blank", "noopener,noreferrer");
    return {
      success: false,
      message: "După achiziție vei primi un cod de licență. Introdu-l mai jos pentru a activa aplicația.",
    };
  }

  /**
   * Restore a purchase by re-entering the license key.
   */
  static async restorePurchase(codeOrKey: string): Promise<LicenseActivationResult> {
    return PurchaseService.activateLicense(codeOrKey);
  }

  /**
   * Remove the stored license. The app falls back to the trial window
   * (still running, or expired and locked).
   */
  static resetToFree(): void {
    try {
      localStorage.removeItem(LICENSE_STORAGE_KEY);
    } catch {
      // storage unavailable: nothing persisted to remove
    }
    notify(PurchaseService.getLicense());
  }
}
