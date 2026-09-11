import React, { useState } from "react";
import { 
  X, 
  Check, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  CreditCard, 
  Smartphone, 
  Key, 
  ArrowRight,
  CheckCircle2,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PurchaseService } from "../services/purchaseService";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedProvider, setSelectedProvider] = useState<"stripe" | "lemonsqueezy" | "google_play">("stripe");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreCode, setRestoreCode] = useState("");
  const [restoreError, setRestoreError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    setLoading(true);
    setRestoreError(null);
    try {
      const res = await PurchaseService.checkout(selectedProvider);
      if (res.success) {
        setSuccessMessage(res.message);
        if (onSuccess) onSuccess();
        setTimeout(() => {
          setSuccessMessage(null);
          onClose();
        }, 1800);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreCode.trim()) return;
    setLoading(true);
    setRestoreError(null);
    const res = await PurchaseService.restorePurchase(restoreCode);
    setLoading(false);
    if (res.success) {
      setSuccessMessage(res.message);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } else {
      setRestoreError(res.message);
    }
  };

  const featuresList = [
    { name: "AI Coach & Volume Analyzer (Gemini 3.8 Flash)", free: false, pro: true },
    { name: "Detecție Stagnare & Sugestii Progressive Overload", free: false, pro: true },
    { name: "Calorie & Macro Tracker Integrat (P / C / F)", free: false, pro: true },
    { name: "Grafice Avansate 1RM & Volum pe Grupe Musculare", free: false, pro: true },
    { name: "Rutine & Template-uri Nelimitate (PPL, Upper/Lower)", free: "Max 2", pro: "Nelimitate" },
    { name: "Cloud Sync & Export CSV / JSON complet", free: false, pro: true },
    { name: "Logging de bază, serii, repetări & RPE", free: true, pro: true },
    { name: "Rest Timer configurabil la sală", free: true, pro: true },
    { name: "Fără reclame & utilizare offline completă", free: true, pro: true },
  ];

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden my-6"
      >
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 dark:from-orange-500 dark:via-amber-500 dark:to-orange-600 p-8 text-white dark:text-black">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white dark:text-black transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest backdrop-blur-sm mb-3">
            <Sparkles className="size-3.5" />
            Deblocare Unică • Fără Abonamente
          </div>

          <h2 className="text-3xl font-black tracking-tight uppercase leading-none mb-2">
            FitTrack PRO Lifetime
          </h2>
          <p className="text-xs font-bold uppercase tracking-wider opacity-90">
            Maximizați hipertrofia & rezultatele la sală
          </p>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black tracking-tight">19.99 RON</span>
            <span className="text-xs font-black uppercase tracking-widest opacity-80">
              (~4 EUR) • Plată Unică
            </span>
          </div>
        </div>

        {/* Success Overlay */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-white/95 dark:bg-zinc-950/95 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="size-20 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-4">
                <CheckCircle2 className="size-12" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                Acces PRO Activat!
              </h3>
              <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 max-w-xs">
                {successMessage}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Proposition callout */}
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-orange-500/10 border border-blue-100 dark:border-orange-500/20 text-center">
            <p className="text-xs sm:text-sm font-black text-blue-950 dark:text-orange-300 leading-snug">
              „Fără abonamente lunare. 19.99 lei o singură dată pentru acces pe viață la AI Coach, nutriție și analize avansate.”
            </p>
          </div>

          {/* Comparison List */}
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {featuresList.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800/60"
              >
                <span className="font-semibold text-slate-700 dark:text-zinc-300 pr-2">
                  {f.name}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  {typeof f.pro === "string" ? (
                    <span className="text-[10px] font-black text-blue-600 dark:text-orange-400 uppercase">
                      {f.pro}
                    </span>
                  ) : f.pro ? (
                    <div className="size-5 rounded-full bg-blue-600 dark:bg-orange-500 text-white dark:text-black flex items-center justify-center">
                      <Check className="size-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <Lock className="size-3.5 text-slate-300 dark:text-zinc-600" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Payment Provider Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
              Alege Metoda de Plată
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedProvider("stripe")}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                  selectedProvider === "stripe"
                    ? "border-blue-600 dark:border-orange-500 bg-blue-50/50 dark:bg-orange-500/10 text-blue-600 dark:text-orange-400"
                    : "border-slate-200 dark:border-zinc-800 text-slate-500 hover:border-slate-300"
                }`}
              >
                <CreditCard className="size-5 mb-1" />
                <span>Stripe</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedProvider("lemonsqueezy")}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                  selectedProvider === "lemonsqueezy"
                    ? "border-blue-600 dark:border-orange-500 bg-blue-50/50 dark:bg-orange-500/10 text-blue-600 dark:text-orange-400"
                    : "border-slate-200 dark:border-zinc-800 text-slate-500 hover:border-slate-300"
                }`}
              >
                <Zap className="size-5 mb-1" />
                <span>LemonSqueezy</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedProvider("google_play")}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                  selectedProvider === "google_play"
                    ? "border-blue-600 dark:border-orange-500 bg-blue-50/50 dark:bg-orange-500/10 text-blue-600 dark:text-orange-400"
                    : "border-slate-200 dark:border-zinc-800 text-slate-500 hover:border-slate-300"
                }`}
              >
                <Smartphone className="size-5 mb-1" />
                <span>Google Play</span>
              </button>
            </div>
          </div>

          {/* Action CTA Button */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white dark:text-zinc-950 font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-600/30 dark:shadow-orange-500/30 active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="size-5" />
                <span>Cumpără Acum • 19.99 RON</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>

          {/* Restore / Promo Code Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-center">
            {!showRestore ? (
              <button
                onClick={() => setShowRestore(true)}
                className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-orange-400 uppercase tracking-wider transition-colors cursor-pointer"
              >
                Ai deja o licență sau un cod promoțional?
              </button>
            ) : (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cod licență (ex: VIP2026, FITTRACK-PRO)"
                      value={restoreCode}
                      onChange={(e) => setRestoreCode(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-orange-500"
                    />
                  </div>
                  <button
                    onClick={handleRestore}
                    disabled={loading || !restoreCode.trim()}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    Activează
                  </button>
                </div>
                {restoreError && (
                  <p className="text-[11px] font-bold text-red-500">{restoreError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
