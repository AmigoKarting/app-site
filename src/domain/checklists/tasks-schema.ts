import { z } from "zod";

export const checklistSectionEnum = z.enum(["opening", "during", "closing", "free_time", "meeting"]);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const targetRoleEnum = z.enum(["caissiere", "superviseur"]);

export const createChecklistTaskSchema = z.object({
  task_key: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9_]*$/, "Slug invalide (lettres minuscules, chiffres, _)")
    .optional()
    .or(z.literal("")),
  section: checklistSectionEnum,
  label: z.string().trim().min(1, "Texte requis").max(300),
  sort_order: z.coerce.number().int().min(0).max(99999).default(0),
  is_active: z
    .preprocess((v) => v === "on" || v === "true" || v === true, z.boolean())
    .default(true),
  target_role: targetRoleEnum.default("caissiere"),
}).transform((v) => ({
  ...v,
  task_key: v.task_key && v.task_key.length > 0 ? v.task_key : slugify(v.label).slice(0, 80) || "task",
}));

export const updateChecklistTaskSchema = z.object({
  id: z.string().uuid(),
  section: checklistSectionEnum,
  label: z.string().trim().min(1, "Texte requis").max(300),
  sort_order: z.coerce.number().int().min(0).max(99999),
  is_active: z
    .preprocess((v) => v === "on" || v === "true" || v === true, z.boolean())
    .default(true),
  target_role: targetRoleEnum.default("caissiere"),
});

export type CreateChecklistTaskInput = z.infer<typeof createChecklistTaskSchema>;
export type UpdateChecklistTaskInput = z.infer<typeof updateChecklistTaskSchema>;
