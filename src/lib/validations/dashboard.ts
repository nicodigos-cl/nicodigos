import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

export const dashboardRangeValues = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "this_month",
  "last_month",
  "custom",
] as const;

export const dashboardQuerySchema = z
  .object({
    range: z.preprocess(
      emptyToUndefined,
      z.enum(dashboardRangeValues).optional(),
    ),
    from: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
        .optional(),
    ),
    to: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
        .optional(),
    ),
  })
  .superRefine((value, ctx) => {
    if (value.range === "custom" || value.from || value.to) {
      if (!value.from || !value.to) {
        ctx.addIssue({
          code: "custom",
          path: ["from"],
          message: "El rango personalizado requiere desde y hasta",
        });
      } else if (value.from > value.to) {
        ctx.addIssue({
          code: "custom",
          path: ["to"],
          message: "La fecha final debe ser posterior a la inicial",
        });
      }
    }
  });

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const dashboardRangeLabel: Record<
  (typeof dashboardRangeValues)[number],
  string
> = {
  today: "Hoy",
  yesterday: "Ayer",
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  this_month: "Este mes",
  last_month: "Mes anterior",
  custom: "Personalizado",
};
