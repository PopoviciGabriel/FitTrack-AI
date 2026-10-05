import React, { useState } from "react";
import { Dumbbell, Key, ShieldCheck, AlertCircle, Clock } from "lucide-react";
import { motion } from "motion/react";
import { PurchaseService, LICENSE_STORE_URL } from "../services/purchaseService";
import { cn } from "../lib/utils";

interface ActivationScreenProps {
  onActivated?: () => void;
  /** Shows the "trial ended" notice when the free 7 days ran out. */
  trialExpired?: boolean;
}

export const ActivationScreen: React.FC<ActivationScreenProps> = ({ onActivated, trialExpired = false }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    const result = await PurchaseService.activateLicense(code);
    setLoading(false);

    if (result.success) {
      onActivated?.();
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="dark">
      <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-orange-500/30 flex items-center justify-center px-5 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-sm"
        >
          <div className="flex flex-col items-center text-center mb-10">
            <div className="p-5 rounded-[2rem] bg-orange-500 text-black mb-6 shadow-2xl shadow-orange-500/20">
              <Dumbbell className="size-10" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">
              FitTrack Pro
            </h1>
            <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2 leading-none">
              Lifetime Access
            </p>
          </div>

          {trialExpired && (
            <div
              role="status"
              className="mb-4 flex items-start gap-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20"
            >
              <Clock className="size-4 shrink-0 mt-0.5 text-orange-500" />
              <p className="min-w-0 break-words text-[12px] leading-relaxed font-semibold text-zinc-300">
                <span className="font-black text-orange-500">Perioada de trial de 7 zile s-a încheiat.</span>{" "}
                Datele tale sunt în siguranță pe acest dispozitiv. Introdu cheia de activare pentru a continua.
              </p>
            </div>
          )}

          <form
            onSubmit={handleActivate}
            className="p-6 sm:p-8 bg-[#141414] border border-white/5 rounded-[2.5rem] space-y-5"
          >
            <div className="space-y-2">
              <label
                htmlFor="license-code"
                className="text-[10px] font-black uppercase tracking-widest text-zinc-500"
              >
                Cod de licență
              </label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
                <input
                  id="license-code"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  placeholder="FITPRO-XXXX-XXXX"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    if (error) setError(null);
                  }}
                  aria-invalid={error !== null}
                  aria-describedby={error ? "license-error" : undefined}
                  className={cn(
                    "w-full pl-11 pr-4 py-4 rounded-2xl bg-zinc-950/60 border text-sm font-mono font-bold tracking-widest text-zinc-50 placeholder:text-zinc-700 focus:outline-none focus:ring-2 transition-all",
                    error
                      ? "border-red-500/60 focus:ring-red-500/40"
                      : "border-white/10 focus:ring-orange-500/50"
                  )}
                />
              </div>
              {error && (
                <p
                  id="license-error"
                  role="alert"
                  className="flex items-start gap-1.5 text-[11px] font-bold text-red-500"
                >
                  <AlertCircle className="size-3.5 shrink-0 mt-px" />
                  <span>{error}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-4 rounded-2xl bg-orange-500 text-black font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
            >
              {loading ? (
                <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="size-5" />
                  <span>Activează Aplicația</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] font-semibold text-zinc-500">
            Nu ai un cod?{" "}
            <a
              href={LICENSE_STORE_URL}
              className="font-black text-orange-500 hover:text-orange-400 underline underline-offset-2 transition-colors"
            >
              Cumpără acces pe viață aici.
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
};
