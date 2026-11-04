import { z } from "zod";
import { GLOBAL_ROLES } from "@/server/policies/roles";

export const ADMIN_PAGE_SIZE = 50;

export const userListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const roleChangeSchema = z.object({
  userId: z.string().min(1).max(64),
  role: z.enum(GLOBAL_ROLES),
});
export const roleChangeModeSchema = z.enum(["grant", "revoke"]);

export type RoleChangeInput = z.infer<typeof roleChangeSchema>;

export const auditListQuerySchema = z.object({
  action: z.string().trim().max(80).optional(),
  targetType: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});
export type AuditListQuery = z.infer<typeof auditListQuerySchema>;

export const reauthSchema = z.object({
  password: z.string().min(1).max(128),
});
