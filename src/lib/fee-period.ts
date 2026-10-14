import { z } from "zod";

export const feePeriodSchema = z
  .object({
    period_start: z.iso.date(),
    period_end: z.iso.date(),
  })
  .refine((p) => p.period_start <= p.period_end, {
    path: ["period_end"],
    message: "Koniec obdobia nesmie byť pred jeho začiatkom.",
  });

export function feePeriodLabel(start: string | null, end: string | null) {
  if (!start || !end) return "Obdobie nebolo uvedené";
  const format = (date: string) => date.split("-").reverse().join(". ");
  return `${format(start)} – ${format(end)}`;
}
