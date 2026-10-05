import { registerSW } from "virtual:pwa-register";

/**
 * Registers the generated service worker so the app shell is precached and
 * works without a connection. With `registerType: "autoUpdate"` new versions
 * activate on their own.
 */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;

  registerSW({
    immediate: true,
    onOfflineReady() {
      console.info("FitTrack Pro: aplicația este disponibilă offline.");
    },
    onRegisterError(error: unknown) {
      console.error("FitTrack Pro: înregistrarea service worker a eșuat.", error);
    },
  });
}

/**
 * Asks the browser not to evict localStorage under storage pressure, which
 * otherwise can happen for non-installed sites on Android/iOS. Returns whether
 * storage is persistent.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;

  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
