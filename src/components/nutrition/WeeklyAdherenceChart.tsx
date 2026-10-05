import React, { useState, useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine, 
  Cell 
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { TrendingUp, Award, CheckCircle2, Flame, Dumbbell } from "lucide-react";
import { MacroDay, MacroGoal } from "../../types";
import { loadMacroDay } from "../../services/storageService";

interface WeeklyAdherenceChartProps {
  currentGoal: MacroGoal;
  /** Day currently being edited; used instead of storage so the chart is never one edit behind. */
  liveDay?: MacroDay;
}

export const WeeklyAdherenceChart: React.FC<WeeklyAdherenceChartProps> = ({ currentGoal, liveDay }) => {
  const [metric, setMetric] = useState<"protein" | "calories">("protein");

  // Read last 7 days from localStorage
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      const dateKey = format(d, "yyyy-MM-dd");
      const dayName = format(d, "EEE", { locale: ro });

      const dayData =
        liveDay && liveDay.date === dateKey
          ? liveDay
          : loadMacroDay(dateKey, {
              date: dateKey,
              targetCalories: currentGoal.calories,
              targetProtein: currentGoal.protein,
              targetCarbs: currentGoal.carbs,
              targetFats: currentGoal.fats,
              waterMl: 0,
              meals: [],
            });
      const calories = dayData.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
      const protein = dayData.meals.reduce((sum, m) => sum + (m.protein || 0), 0);

      const proteinTarget = currentGoal.protein || 180;
      const calorieTarget = currentGoal.calories || 2800;

      data.push({
        dateKey,
        dayName: dayName.toUpperCase(),
        calories,
        protein: Math.round(protein),
        proteinTarget,
        calorieTarget,
        proteinMet: protein >= proteinTarget,
        caloriesMet: calories >= calorieTarget * 0.9 && calories <= calorieTarget * 1.1,
      });
    }

    return data;
  }, [currentGoal, liveDay]);

  const proteinDaysMet = chartData.filter((d) => d.proteinMet).length;
  const adherenceRate = Math.round((proteinDaysMet / 7) * 100);

  const targetLine = metric === "protein" ? currentGoal.protein : currentGoal.calories;

  return (
    <div className="p-5 rounded-[2rem] bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-white/5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500">
            <Award className="size-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Aderență Săptămânală & Consistență
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-black">
                {adherenceRate}% Aderență
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {proteinDaysMet} din 7 zile cu ținta proteică atinsă
            </p>
          </div>
        </div>

        {/* Metric Selector Toggle */}
        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-zinc-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric("protein")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 ${
              metric === "protein"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-800"
            }`}
          >
            <Dumbbell className="size-3.5" />
            <span>Proteine (g)</span>
          </button>

          <button
            type="button"
            onClick={() => setMetric("calories")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 ${
              metric === "calories"
                ? "bg-white dark:bg-zinc-900 text-orange-600 dark:text-orange-400 shadow-sm"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-800"
            }`}
          >
            <Flame className="size-3.5" />
            <span>Calorii (kcal)</span>
          </button>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      <div className="h-48 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="dayName"
              stroke="#71717a"
              fontSize={11}
              fontWeight={700}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[0, (dataMax: number) => Math.max(dataMax, targetLine * 1.15)]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="p-2.5 rounded-xl bg-slate-900 text-white text-xs border border-white/10 shadow-xl">
                      <p className="font-bold text-slate-400">{data.dateKey} ({data.dayName})</p>
                      <p className="font-black text-sm text-white mt-0.5">
                        {metric === "protein" ? `${data.protein}g Proteine` : `${data.calories} kcal`}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Țintă: {metric === "protein" ? `${currentGoal.protein}g` : `${currentGoal.calories} kcal`}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine
              y={targetLine}
              stroke="#f97316"
              strokeDasharray="3 3"
              label={{
                value: `Țintă: ${targetLine}${metric === "protein" ? "g" : " kcal"}`,
                fill: "#f97316",
                fontSize: 10,
                position: "top",
              }}
            />
            <Bar dataKey={metric} radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => {
                const isSuccess =
                  metric === "protein"
                    ? entry.protein >= currentGoal.protein
                    : entry.calories >= currentGoal.calories * 0.9;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      isSuccess
                        ? metric === "protein" ? "#3b82f6" : "#f97316"
                        : "#71717a50"
                    }
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Advice */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-blue-500" />
          Țintă atinsă ({metric === "protein" ? `≥${currentGoal.protein}g` : `~${currentGoal.calories} kcal`})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-zinc-500/40" />
          Sub necesar
        </span>
      </div>
    </div>
  );
};
