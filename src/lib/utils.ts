import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: string | Date | number) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
  });
};

/** Monday-first, matching `(Date.getDay() + 6) % 7` (getDay(): 0 = Sunday, 1 = Monday). */
const RO_WEEKDAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"] as const;

export const getRoWeekdayName = (date: Date): string => RO_WEEKDAYS[(date.getDay() + 6) % 7];

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Plain "YYYY-MM-DD" keys are read as local days (new Date("YYYY-MM-DD") is UTC midnight and can shift the day). */
const toLocalDate = (value: string | Date | number): Date | null => {
  if (typeof value === "string") {
    const plain = DAY_KEY.exec(value);
    if (plain) return new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]));
  }
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "Luni, 5 octombrie" */
export const formatWeekdayDate = (date: string | Date | number): string => {
  const d = toLocalDate(date);
  if (!d) return "--";
  const month = d.toLocaleDateString("ro-RO", { month: "long" });
  return `${getRoWeekdayName(d)}, ${d.getDate()} ${month}`;
};
