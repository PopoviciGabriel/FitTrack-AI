import { LicenseInfo } from "../types";

// Always 100% PRO Lifetime, 100% Free, active for all users
const PERMANENT_PRO_LICENSE: LicenseInfo = {
  isProUser: true,
  tier: "pro_lifetime",
  purchaseDate: new Date().toISOString(),
  orderId: "FITTRACK-FREE-PRO",
  pricePaid: "0 RON (Complet Gratuit)",
};

type LicenseListener = (info: LicenseInfo) => void;
const listeners = new Set<LicenseListener>();

export class PurchaseService {
  /**
   * Get currently active license status (Always PRO)
   */
  static getLicense(): LicenseInfo {
    return PERMANENT_PRO_LICENSE;
  }

  /**
   * Subscribe to license status changes
   */
  static subscribe(listener: LicenseListener): () => void {
    listeners.add(listener);
    // Notify immediately with PRO status
    listener(PERMANENT_PRO_LICENSE);
    return () => {
      listeners.delete(listener);
    };
  }

  /**
   * Check if current user has active PRO lifetime access (Always true)
   */
  static isPro(): boolean {
    return true;
  }

  /**
   * Checkout simulation - immediately grants pro access for free
   */
  static async checkout(provider: "stripe" | "lemonsqueezy" | "google_play" = "stripe"): Promise<{ success: boolean; message: string; license?: LicenseInfo }> {
    return {
      success: true,
      message: "FitTrack PRO este complet gratuit! Toate funcțiile sunt deja deblocate.",
      license: PERMANENT_PRO_LICENSE,
    };
  }

  /**
   * Restore purchases
   */
  static async restorePurchase(_codeOrEmail: string): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: "Toate funcțiile PRO sunt deblocate gratuit pentru toți utilizatorii!",
    };
  }

  /**
   * Reset to Free (Keeps Pro since app is 100% free)
   */
  static resetToFree(): void {
    listeners.forEach(fn => fn(PERMANENT_PRO_LICENSE));
  }
}
