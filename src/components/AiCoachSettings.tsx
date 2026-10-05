import React, { useState } from "react";
import { Eye, EyeOff, ExternalLink, KeyRound } from "lucide-react";
import { getUserGeminiKey, isValidGeminiKey, saveUserGeminiKey } from "../services/geminiService";

type Feedback = { kind: "success" | "error"; text: string } | null;

export const AiCoachSettings: React.FC = () => {
  const [savedKey, setSavedKey] = useState<string | null>(() => getUserGeminiKey());
  const [draft, setDraft] = useState<string>(() => getUserGeminiKey() ?? "");
  const [visible, setVisible] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const trimmed = draft.trim();
  const unchanged = trimmed === (savedKey ?? "");

  const handleSave = () => {
    if (trimmed && !isValidGeminiKey(trimmed)) {
      setFeedback({
        kind: "error",
        text: "Cheie invalidă: trebuie să înceapă cu „AQ.” sau „AIza” și să aibă peste 30 de caractere.",
      });
      return;
    }
    if (!saveUserGeminiKey(trimmed)) {
      setFeedback({ kind: "error", text: "Nu am putut salva cheia. Verifică setările de stocare ale browserului." });
      return;
    }
    setSavedKey(trimmed || null);
    setFeedback({
      kind: "success",
      text: trimmed ? "Cheie salvată. AI Coach folosește acum Gemini." : "Cheie ștearsă. AI Coach rulează offline.",
    });
  };

  const handleRemove = () => {
    if (!saveUserGeminiKey("")) {
      setFeedback({ kind: "error", text: "Nu am putut șterge cheia. Verifică setările de stocare ale browserului." });
      return;
    }
    setDraft("");
    setSavedKey(null);
    setFeedback({ kind: "success", text: "Cheie ștearsă. AI Coach rulează offline." });
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 space-y-3">
      <div className="flex justify-between items-center gap-3">
        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <KeyRound className="size-3.5" />
          Configurare AI Coach
        </span>
        {savedKey ? (
          <span className="text-[10px] font-black uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/20">
            Gemini activ
          </span>
        ) : (
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 bg-slate-500/10 px-2.5 py-0.5 rounded-full border border-slate-500/20">
            Mod offline
          </span>
        )}
      </div>

      <p className="text-xs text-slate-600 dark:text-zinc-400 font-semibold">
        Introdu propria cheie Gemini API (gratuită de la Google). Se salvează doar pe acest dispozitiv. Fără cheie,
        AI Coach folosește recomandări offline.
      </p>

      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setFeedback(null);
          }}
          placeholder="AQ.… sau AIza…"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Cheie Gemini API"
          className="w-full min-h-12 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:focus:ring-orange-500/30"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ascunde cheia" : "Arată cheia"}
          className="absolute right-1 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center text-slate-400 cursor-pointer"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={unchanged}
          className="flex-1 min-h-11 rounded-xl bg-blue-600 dark:bg-orange-500 text-white dark:text-black font-black text-[10px] uppercase tracking-[0.15em] active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Salvează cheia
        </button>
        {savedKey && (
          <button
            type="button"
            onClick={handleRemove}
            className="min-h-11 px-4 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-black text-[10px] uppercase tracking-[0.15em] active:scale-95 transition-all cursor-pointer"
          >
            Șterge
          </button>
        )}
      </div>

      {feedback && (
        <p
          role="status"
          className={
            feedback.kind === "success"
              ? "text-xs font-bold text-green-600 dark:text-green-400"
              : "text-xs font-bold text-red-500"
          }
        >
          {feedback.text}
        </p>
      )}

      <a
        href="https://aistudio.google.com/apikey"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-orange-500"
      >
        Obține o cheie gratuită
        <ExternalLink className="size-3" />
      </a>
    </div>
  );
};
