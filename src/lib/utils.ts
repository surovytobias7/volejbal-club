import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { sk } from "date-fns/locale";

export const TIME_ZONE = "Europe/Bratislava";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function money(cents: number) {
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
export function dateTime(value: string, pattern = "d. MMMM, HH:mm") {
  return formatInTimeZone(value, TIME_ZONE, pattern, { locale: sk });
}
export function localToUtc(value: string) {
  const date = fromZonedTime(value, TIME_ZONE);
  if (
    !Number.isFinite(date.getTime()) ||
    formatInTimeZone(date, TIME_ZONE, "yyyy-MM-dd'T'HH:mm") !== value
  ) {
    throw new Error(
      "Tento miestny čas neexistuje. Skontrolujte zmenu letného času.",
    );
  }
  // Reject ambiguous autumn times instead of silently selecting an offset.
  for (const delta of [-3600000, 3600000]) {
    if (
      formatInTimeZone(
        new Date(date.getTime() + delta),
        TIME_ZONE,
        "yyyy-MM-dd'T'HH:mm",
      ) === value
    ) {
      throw new Error(
        "Čas sa pri zmene letného času opakuje. Vyberte iný čas.",
      );
    }
  }
  return date.toISOString();
}
export function balance(amount: number, payments: number[]) {
  return amount - payments.reduce((sum, p) => sum + p, 0);
}
