import React, { useEffect, useState } from "react";
import { LicenseInfo } from "../types";
import { PurchaseService, licensesEqual } from "../services/purchaseService";
import { ActivationScreen } from "./ActivationScreen";

interface ProGuardProps {
  feature?: string;
  featureTitle?: string;
  title?: string;
  badge?: string;
  description?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onUpgradeClick?: () => void;
  showPreview?: boolean;
}

const TRIAL_RECHECK_INTERVAL_MS = 60_000;

/**
 * Access gate: children are mounted while a valid license is stored or the
 * 7-day trial is still running. Otherwise the activation screen (or a custom
 * fallback) is rendered. Re-checks the clock periodically and when the app
 * returns to the foreground, so a trial that ends while the app stays open
 * locks it without a reload; activation unlocks it the same way.
 */
export const ProGuard: React.FC<ProGuardProps> = ({ children, fallback }) => {
  const [license, setLicense] = useState<LicenseInfo>(() => PurchaseService.getLicense());

  useEffect(() => {
    const unsubscribe = PurchaseService.subscribe((next) =>
      setLicense((prev) => (licensesEqual(prev, next) ? prev : next))
    );

    const recheck = () => {
      PurchaseService.refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") recheck();
    };

    const intervalId = window.setInterval(recheck, TRIAL_RECHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      unsubscribe();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!license.isProUser) {
    return <>{fallback ?? <ActivationScreen trialExpired={license.trialExpired} />}</>;
  }

  return <>{children}</>;
};
