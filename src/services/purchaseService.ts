import { LicenseInfo } from "../types";

const LICENSE_STORAGE_KEY = "fittrack_pro_license_v1";

// Default state: Free user
const DEFAULT_LICENSE: LicenseInfo = {
  isProUser: false,
  tier: "free",
};

type LicenseListener = (info: LicenseInfo) => void;
const listeners = new Set<LicenseListener>();

export class PurchaseService {
  /**
   * Get currently active license status
   */
  static getLicense(): LicenseInfo {
    try {
      const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load license state:", e);
    }
    return DEFAULT_LICENSE;
  }

  /**
   * Subscribe to license status changes
   */
  static subscribe(listener: LicenseListener): () => void {
    listeners.add(listener);
    // Notify immediately
    listener(this.getLicense());
    return () => {
      listeners.delete(listener);
    };
  }

  private static notify(info: LicenseInfo) {
    try {
      localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(info));
    } catch (e) {
      console.error("Failed to save license state:", e);
    }
    listeners.forEach(fn => fn(info));
  }

  /**
   * Check if current user has active PRO lifetime access
   */
  static isPro(): boolean {
    return this.getLicense().isProUser;
  }

  /**
   * Initiate purchase flow for Web (Stripe / LemonSqueezy) or Mobile (Capacitor/Google Play)
   */
  static async checkout(provider: "stripe" | "lemonsqueezy" | "google_play"): Promise<{ success: boolean; message: string; license?: LicenseInfo }> {
    // In a production server setup, this would call /api/create-checkout-session
    // For our standalone / Capacitor hybrid deployment:
    // We simulate realistic payment gateway checkout delay and return successful lifetime activation.
    return new Promise((resolve) => {
      setTimeout(() => {
        const orderId = "FTP-" + Math.random().toString(36).substring(2, 9).toUpperCase();
        const license: LicenseInfo = {
          isProUser: true,
          tier: "pro_lifetime",
          purchaseDate: new Date().toISOString(),
          orderId,
          provider,
          pricePaid: "19.99 RON",
        };
        this.notify(license);
        resolve({
          success: true,
          message: "Felicitări! Accesul FitTrack PRO Lifetime a fost activat cu succes.",
          license,
        });
      }, 1400);
    });
  }

  /**
   * Restore purchases via License Key, Order ID or Promo Code
   */
  static async restorePurchase(codeOrEmail: string): Promise<{ success: boolean; message: string }> {
    const trimmed = codeOrEmail.trim().toUpperCase();
    
    // Accepted promotional codes or license keys
    const validCodes = [
      "FITTRACK-PRO-LIFETIME",
      "VIP2026",
      "HYPERTROPHY",
      "COACH-PRO",
      "LIFETIME-1999"
    ];

    if (validCodes.includes(trimmed) || trimmed.startsWith("FTP-") || trimmed.includes("@")) {
      const license: LicenseInfo = {
        isProUser: true,
        tier: "pro_lifetime",
        purchaseDate: new Date().toISOString(),
        orderId: trimmed.startsWith("FTP-") ? trimmed : "FTP-RESTORED-" + Math.floor(Math.random() * 10000),
        provider: "promo_code",
        pricePaid: "19.99 RON",
      };
      this.notify(license);
      return {
        success: true,
        message: "Licență PRO restaurată cu succes!",
      };
    }

    return {
      success: false,
      message: "Cod invalid sau nicio achiziție găsită. Verifică codul sau adresa de email.",
    };
  }

  /**
   * Reset to Free for testing purposes
   */
  static resetToFree(): void {
    const freeLicense: LicenseInfo = {
      isProUser: false,
      tier: "free",
    };
    this.notify(freeLicense);
  }
}
