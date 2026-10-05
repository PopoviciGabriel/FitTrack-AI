import React from "react";
import { Sparkles } from "lucide-react";
import { LicenseInfo } from "../types";

interface TrialBannerProps {
  license: LicenseInfo;
  onBuyClick: () => void;
}

export const formatTrialDays = (days: number): string => (days === 1 ? "1 zi" : `${days} zile`);

/** Subtle strip shown only while the free trial is running. */
export const TrialBanner: React.FC<TrialBannerProps> = ({ license, onBuyClick }) => {
  if (license.tier !== "trial" || license.trialDaysLeft === undefined) return null;

  const daysLeft = license.trialDaysLeft;

  return (
    <div className="max-w-lg mx-auto px-4 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4 py-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20">
        <p className="flex min-w-0 items-center gap-2 text-[11px] font-bold text-zinc-300">
          <Sparkles className="size-3.5 shrink-0 text-orange-500" />
          <span className="min-w-0 break-words">
            Trial gratuit: Mai ai{" "}
            <span className="font-black text-orange-500">{formatTrialDays(daysLeft)}</span>.
          </span>
        </p>
        <button
          type="button"
          onClick={onBuyClick}
          className="shrink-0 text-[10px] font-black uppercase tracking-wider text-orange-500 underline underline-offset-2 hover:text-orange-400 active:scale-95 transition-all cursor-pointer py-1"
        >
          Cumpără Acces pe Viață
        </button>
      </div>
    </div>
  );
};
