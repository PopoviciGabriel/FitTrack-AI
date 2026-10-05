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
import { Workout, ProgressEntry, CustomExercise } from "../types";
import {
  sanitizeWorkouts,
  sanitizeProgress,
  sanitizeCustomExercises,
  loadCustomExercises,
} from "../services/storageService";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workouts: Workout[];
  progress: ProgressEntry[];
  onImportData: (workouts: Workout[], progress: ProgressEntry[], customExercises: CustomExercise[]) => void;
  onUpgradeClick?: () => void;
}

const escapeCsvField = (value: string | number): string => `"${String(value).replace(/"/g, '""')}"`;

const CONFIRM_IMPORT_MESSAGE =
  "Importul va ÎNLOCUI antrenamentele de pe acest dispozitiv cu cele din fișier. Continui?";

/**
 * Robust CSV parser that reads workout records exported from FitTrack,
 * Excel, or other fitness tracking platforms and reconstructs Workout[] items.
 */
function parseCSVToWorkouts(csvContent: string): Workout[] {
  // Normalize newline characters across OS platforms (iOS, Windows, Mac, Linux)
  const lines = csvContent
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return [];
  }

  // Detect delimiter automatically: check header for semicolon, comma, or tab
  const headerLine = lines[0];
  let delimiter = ",";
  const commas = (headerLine.match(/,/g) || []).length;
  const semicolons = (headerLine.match(/;/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;
  if (semicolons > commas && semicolons > tabs) {
    delimiter = ";";
  } else if (tabs > commas && tabs > semicolons) {
    delimiter = "\t";
  }

  // Tokenize row while respecting quoted strings containing delimiters
  const parseRow = (rowStr: string): string[] => {
    const tokens: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < rowStr.length; i++) {
      const char = rowStr[i];
      if (char === '"') {
        if (inQuotes && rowStr[i + 1] === char) {
          current += char;
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        tokens.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    tokens.push(current.trim());
    return tokens;
  };

  const headers = parseRow(headerLine).map((h) => h.toLowerCase().trim());

  // Match column indices flexibly by keyword
  let dateIdx = headers.findIndex((h) => h.includes("dat") || h.includes("time"));
  let titleIdx = headers.findIndex(
    (h) => h.includes("antrenament") || h.includes("workout") || h.includes("rutin") || h.includes("title")
  );
  let exerciseIdx = headers.findIndex(
    (h, idx) =>
      idx !== titleIdx &&
      (h.includes("exerc") ||
        h.includes("nume") ||
        h.includes("exercise") ||
        h === "name" ||
        h.includes("exercise_name") ||
        h.includes("exercise name"))
  );
  let weightIdx = headers.findIndex(
    (h) => h.includes("greutat") || h.includes("weight") || h.includes("kg") || h.includes("lbs")
  );
  let repsIdx = headers.findIndex((h) => h.includes("repet") || h.includes("rep"));
  let rpeIdx = headers.findIndex((h) => h.includes("rpe"));
  let completedIdx = headers.findIndex(
    (h) => h.includes("complet") || h.includes("done") || h.includes("status")
  );

  // Fallbacks if header labels do not match standard naming
  if (dateIdx === -1) dateIdx = 0;
  if (titleIdx === -1) titleIdx = 1;
  if (exerciseIdx === -1) exerciseIdx = titleIdx === 2 ? 1 : 2;
  if (weightIdx === -1) weightIdx = 4;
  if (repsIdx === -1) repsIdx = 5;

  // Group rows into workouts: key = `${date}___${title}`
  const workoutsMap = new Map<
    string,
    {
      date: string;
      title: string;
      exercises: Map<
        string,
        {
          name: string;
          sets: { id: string; weight: number; reps: number; completed: boolean; rpe?: number }[];
        }
      >;
    }
  >();

  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    // Sanitize and normalize date
    const rawDate = row[dateIdx] || new Date().toISOString().split("T")[0];
    let dateStr = rawDate.split(" ")[0].trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parsedD = new Date(rawDate);
      if (!isNaN(parsedD.getTime())) {
        dateStr = parsedD.toISOString().split("T")[0];
      } else {
        dateStr = new Date().toISOString().split("T")[0];
      }
    }

    const title = titleIdx !== -1 && row[titleIdx] ? row[titleIdx].trim() : "Antrenament Importat";
    const exercise = exerciseIdx !== -1 && row[exerciseIdx] ? row[exerciseIdx].trim() : "Exercițiu";

    // Parse weight and reps handling decimal commas or letters
    const rawWeight = weightIdx !== -1 && row[weightIdx] ? row[weightIdx].replace(",", ".").replace(/[^0-9.]/g, "") : "0";
    const rawReps = repsIdx !== -1 && row[repsIdx] ? row[repsIdx].replace(/[^0-9]/g, "") : "0";
    const weightVal = parseFloat(rawWeight) || 0;
    const repsVal = parseInt(rawReps, 10) || 0;

    // Parse RPE if available
    let rpeVal: number | undefined = undefined;
    if (rpeIdx !== -1 && row[rpeIdx]) {
      const parsedRpe = parseFloat(row[rpeIdx].replace(",", "."));
      if (!isNaN(parsedRpe) && parsedRpe >= 1 && parsedRpe <= 10) {
        rpeVal = parsedRpe;
      }
    }

    // Determine completion status
    let isCompleted = true;
    if (completedIdx !== -1 && row[completedIdx]) {
      const c = row[completedIdx].toLowerCase().trim();
      if (c === "nu" || c === "false" || c === "0" || c === "no" || c === "incomplete") {
        isCompleted = false;
      }
    }

    const workoutKey = `${dateStr}___${title}`;
    if (!workoutsMap.has(workoutKey)) {
      workoutsMap.set(workoutKey, {
        date: dateStr,
        title: title || "Antrenament",
        exercises: new Map(),
      });
    }

    const workoutObj = workoutsMap.get(workoutKey)!;
    if (!workoutObj.exercises.has(exercise)) {
      workoutObj.exercises.set(exercise, {
        name: exercise,
        sets: [],
      });
    }

    const exerciseObj = workoutObj.exercises.get(exercise)!;
    exerciseObj.sets.push({
      id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      weight: weightVal,
      reps: repsVal,
      completed: isCompleted,
      rpe: rpeVal,
    });
  }

  // Convert map to Workout[]
  const reconstructedWorkouts: Workout[] = [];
  workoutsMap.forEach((w) => {
    const entries = Array.from(w.exercises.values()).map((ex) => ({
      id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      exerciseId: ex.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      name: ex.name,
      sets: ex.sets,
    }));

    if (entries.length > 0) {
      reconstructedWorkouts.push({
        id: `workout-${w.date}-${Math.random().toString(36).substring(2, 9)}`,
        date: w.date,
        title: w.title,
        entries,
      });
    }
  });

  return reconstructedWorkouts;
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
      customExercises: loadCustomExercises(),
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
          csv += `${escapeCsvField(w.date)},${escapeCsvField(w.title)},${escapeCsvField(e.name)},${idx + 1},${s.weight},${s.reps},${s.rpe || ""},${s.completed ? "Da" : "Nu"}\n`;
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
        const content = (event.target?.result as string) || "";
        const trimmed = content.trim();

        const fileName = (file.name || "").toLowerCase();
        const fileType = (file.type || "").toLowerCase();

        // Check if file is JSON by extension, mime type, or leading character
        const isJson =
          fileName.endsWith(".json") ||
          fileType.includes("json") ||
          trimmed.startsWith("{") ||
          trimmed.startsWith("[");

        if (isJson) {
          let parsed: unknown = null;
          let jsonValid = true;
          try {
            parsed = JSON.parse(content);
          } catch {
            jsonValid = false;
          }

          if (jsonValid) {
            const record = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
              ? (parsed as Record<string, unknown>)
              : null;
            const rawWorkouts = Array.isArray(parsed) ? parsed : record?.workouts;

            if (!Array.isArray(rawWorkouts)) {
              alert("Fișierul JSON nu are structura validă FitTrack.");
              return;
            }

            const cleanWorkouts = sanitizeWorkouts(rawWorkouts);
            if (cleanWorkouts.length === 0 && rawWorkouts.length > 0) {
              alert("Fișierul nu conține antrenamente valide. Datele existente nu au fost modificate.");
              return;
            }
            if (!window.confirm(CONFIRM_IMPORT_MESSAGE)) return;

            const cleanProgress = record && "progress" in record ? sanitizeProgress(record.progress) : progress;
            onImportData(cleanWorkouts, cleanProgress, sanitizeCustomExercises(record?.customExercises));
            alert(`Backup restaurat: ${cleanWorkouts.length} antrenamente.`);
            onClose();
            return;
          }

          // Not valid JSON: fall through to the CSV parser when it looks delimited
          if (!(trimmed.includes(",") || trimmed.includes(";") || trimmed.includes("\t"))) {
            alert("Eroare la citirea fișierului JSON.");
            return;
          }
        }

        // CSV Parser flow
        const importedWorkouts = sanitizeWorkouts(parseCSVToWorkouts(content));
        if (importedWorkouts.length > 0) {
          if (!window.confirm(CONFIRM_IMPORT_MESSAGE)) return;
          onImportData(importedWorkouts, progress, []);
          alert(`S-au importat cu succes ${importedWorkouts.length} antrenamente din fișierul CSV!`);
          onClose();
        } else {
          alert("Nu s-au putut extrage antrenamente valide din fișierul CSV. Verifică structura fișierului.");
        }
      } catch (err) {
        console.error("Eroare import:", err);
        alert("Eroare la procesarea fișierului de backup. Asigură-te că fișierul este JSON sau CSV valid.");
      } finally {
        // Reset file input to allow re-selection of the same file
        e.target.value = "";
      }
    };

    reader.onerror = () => {
      alert("Eroare la citirea fișierului de pe dispozitiv.");
      e.target.value = "";
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
            Backup Gratuit
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tight">
            Backup & Export
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
                    Stocare Locală
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                    Datele sunt stocate local pe acest dispozitiv
                  </p>
                </div>
              </div>

              <button
                onClick={triggerCloudSync}
                disabled={syncing}
                className="p-2.5 rounded-xl bg-blue-600 dark:bg-orange-500 text-white dark:text-black hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                title="Verifică starea stocării"
              >
                <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
              </button>
            </div>

            {synced && (
              <div className="flex items-center gap-2 text-xs font-bold text-green-600 dark:text-green-400">
                <CheckCircle2 className="size-4" />
                <span>Datele sunt salvate local. Fă un backup JSON periodic.</span>
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
                  <p className="text-[10px] text-slate-400">Include antrenamentele, progresul și exercițiile custom</p>
                </div>
              </div>
              <Download className="size-4 text-slate-400 shrink-0 ml-2" />
            </button>

            {/* Import JSON / CSV */}
            <label className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left cursor-pointer">
              <div className="flex items-center gap-3">
                <Upload className="size-5 text-purple-600 shrink-0" />
                <div>
                  <p className="font-black text-xs text-slate-900 dark:text-white uppercase">Restaurează din Backup (JSON / CSV)</p>
                  <p className="text-[10px] text-slate-400">Încarcă un fișier de backup JSON sau CSV salvat anterior</p>
                </div>
              </div>
              <input
                type="file"
                accept=".json,.csv,text/csv,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Sticky Bottom Footer */}
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
