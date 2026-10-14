import { z } from "zod";

export const categoriesSchema = z
  .string()
  .max(500)
  .transform((value) => [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ])
  .pipe(z.array(z.string().min(1).max(50)));
