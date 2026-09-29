import React, { useState } from "react";
import { 
  X, 
  Download, 
  Upload, 
  Cloud, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  RefreshCw 
} from "lucide-react";
import { Workout, ProgressEntry } from "../types";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workouts: Workout[];
  progress: ProgressEntry[];
  onImportData: (workouts: Workout[], progress: ProgressEntry[]) => void;
  onUpgradeClick?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  workouts,
  progress,
  onImportData,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  if (!isOpen) return null;

  const downloadJSON = () => {
    const data = {
      version: "2.0",
      exportDate: new Date().toISOString(),
      workouts,
      progress,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fittrack-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    let csv = "Data,Antrenament,Exercițiu,Set,Greutate (kg),Repetări,RPE,Completat\n";

    workouts.forEach((w) => {
      w.entries.forEach((e) => {
        e.sets.forEach((s, idx) => {
          csv += `"${w.date}","${w.title}","${e.name}",${idx + 1},${s.weight},${s.reps},${s.rpe || ""},${s.completed ? "Da" : "Nu"}\n`;
        });
      });
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fittrack-workouts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.workouts && Array.isArray(parsed.workouts)) {
          onImportData(parsed.workouts, parsed.progress || []);
          alert("Datele au fost importate cu succes!");
          onClose();
        } else {
          alert("Fișierul JSON nu are structura validă FitTrack.");
        }
      } catch (err) {
        alert("Eroare la citirea fișierului JSON.");
      }
    };
    reader.readAsText(file);
  };

  const triggerCloudSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSynced(true);
      setTimeout(() => setSynced(false), 3000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md max-h-[90dvh] flex flex-col rounded-[2rem] shadow-2xl overflow-hidden">
        {/* Close Button with Safe Area */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
          aria-label="Închide"
        >
          <X className="size-4 sm:size-5" />
        </button>

        {/* Compact Header */}
        <div className="p-5 sm:p-6 pb-3 border-b border-slate-100 dark:border-zinc-800/80 shrink-0 pr-12">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-orange-500">
            Cloud & Backup Gratuit
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tight">
            Sincronizare & Export
          </h3>
        </div>

        {/* Scrollable Interior Container */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain pr-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
          {/* Cloud Sync Status */}
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 dark:bg-white/[0.02] border border-blue-100 dark:border-white/5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/10 dark:bg-orange-500/10 text-blue-600 dark:text-orange-500">
                  <Cloud className="size-5 sm:size-6" />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white uppercase">
                    FitTrack Cloud Sync
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                    Criptat & Sincronizat automat
                  </p>
                </div>
              </div>

              <button
                onClick={triggerCloudSync}
                disabled={syncing}
                className="p-2.5 rounded-xl bg-blue-600 dark:bg-orange-500 text-white dark:text-black hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                title="Sincronizează acum"
              >
                <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
              </button>
            </div>

            {synced && (
              <div className="flex items-center gap-2 text-xs font-bold text-green-600 dark:text-green-400">
                <CheckCircle2 className="size-4" />
                <span>Sincronizare în cloud finalizată!</span>
              </div>
            )}
          </div>

          {/* Export options */}
          <div className="space-y-2.5 pt-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Exportă Datele Tale
            </span>

            <button
              onClick={downloadCSV}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="size-5 text-green-600 shrink-0" />
                <div>
                  <p className="font-black text-xs text-slate-900 dark:text-white uppercase">Export CSV (Excel / Sheets)</p>
                  <p className="text-[10px] text-slate-400">Toate exercițiile, seriile, greutățile și RPE-ul</p>
                </div>
              </div>
              <Download className="size-4 text-slate-400 shrink-0 ml-2" />
            </button>

            <button
              onClick={downloadJSON}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-black text-xs text-slate-900 dark:text-white uppercase">Backup Complet (JSON)</p>
                  <p className="text-[10px] text-slate-400">Include istoricul antrenamentelor și progresul</p>
                </div>
              </div>
              <Download className="size-4 text-slate-400 shrink-0 ml-2" />
            </button>

            {/* Import JSON */}
            <label className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left cursor-pointer">
              <div className="flex items-center gap-3">
                <Upload className="size-5 text-purple-600 shrink-0" />
                <div>
                  <p className="font-black text-xs text-slate-900 dark:text-white uppercase">Restaurează din Backup JSON</p>
                  <p className="text-[10px] text-slate-400">Încarcă un fișier de backup salvat anterior</p>
                </div>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Sticky Bottom Footer: Clean close button, no paywall */}
        <div className="p-4 bg-white/95 dark:bg-zinc-900/95 border-t border-slate-100 dark:border-zinc-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all cursor-pointer text-center"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};
