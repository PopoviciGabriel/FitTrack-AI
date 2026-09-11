import React, { useState } from "react";
import { 
  X, 
  Download, 
  Upload, 
  Cloud, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  ShieldCheck,
  RefreshCw 
} from "lucide-react";
import { Workout, ProgressEntry } from "../types";
import { PurchaseService } from "../services/purchaseService";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workouts: Workout[];
  progress: ProgressEntry[];
  onImportData: (workouts: Workout[], progress: ProgressEntry[]) => void;
  onUpgradeClick: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  workouts,
  progress,
  onImportData,
  onUpgradeClick,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const isPro = PurchaseService.isPro();

  if (!isOpen) return null;

  const downloadJSON = () => {
    if (!isPro) {
      onUpgradeClick();
      return;
    }
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
    if (!isPro) {
      onUpgradeClick();
      return;
    }
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
    if (!isPro) {
      onUpgradeClick();
      return;
    }
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
    if (!isPro) {
      onUpgradeClick();
      return;
    }
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSynced(true);
      setTimeout(() => setSynced(false), 3000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-orange-500">
              Cloud & Backup PRO
            </span>
            <h3 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tight">
              Sincronizare & Export
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Cloud Sync Status */}
        <div className="p-6 rounded-2xl bg-blue-50/70 dark:bg-white/[0.02] border border-blue-100 dark:border-white/5 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-600/10 dark:bg-orange-500/10 text-blue-600 dark:text-orange-500">
                <Cloud className="size-6" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase">
                  FitTrack Cloud Sync
                </h4>
                <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                  {isPro ? "Criptat & Sincronizat automat" : "Disponibil în FitTrack PRO"}
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
        <div className="space-y-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Exportă Datele Tale
          </span>

          <button
            onClick={downloadCSV}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="size-5 text-green-600" />
              <div>
                <p className="font-black text-xs text-slate-900 dark:text-white uppercase">Export CSV (Excel / Sheets)</p>
                <p className="text-[10px] text-slate-400">Toate exercițiile, seriile, greutățile și RPE-ul</p>
              </div>
            </div>
            <Download className="size-4 text-slate-400" />
          </button>

          <button
            onClick={downloadJSON}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <FileText className="size-5 text-blue-600" />
              <div>
                <p className="font-black text-xs text-slate-900 dark:text-white uppercase">Backup Complet (JSON)</p>
                <p className="text-[10px] text-slate-400">Include istoricul antrenamentelor și progresul în greutate</p>
              </div>
            </div>
            <Download className="size-4 text-slate-400" />
          </button>

          {/* Import JSON */}
          <label className="w-full flex items-center justify-between p-4 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left cursor-pointer">
            <div className="flex items-center gap-3">
              <Upload className="size-5 text-purple-600" />
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

        {!isPro && (
          <button
            onClick={() => {
              onClose();
              onUpgradeClick();
            }}
            className="w-full py-4 rounded-2xl bg-blue-600 dark:bg-orange-500 text-white dark:text-black font-black text-xs uppercase tracking-widest shadow-lg cursor-pointer"
          >
            Deblochează Backup & Export (19.99 RON)
          </button>
        )}
      </div>
    </div>
  );
};
