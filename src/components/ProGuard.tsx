import React from "react";

interface ProGuardProps {
  feature?: string;
  featureTitle?: string;
  description?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onUpgradeClick?: () => void;
  showPreview?: boolean;
}

/**
 * Transparent ProGuard: FitTrack Pro is 100% free with all features accessible to everyone.
 * Directly renders children without locking, modals, or paywalls.
 */
export const ProGuard: React.FC<ProGuardProps> = ({ children }) => {
  return <>{children}</>;
};
