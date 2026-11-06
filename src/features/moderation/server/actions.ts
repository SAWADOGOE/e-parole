"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/server/actions/action";
import { adminAction } from "@/server/actions/admin-action";
import { AppError } from "@/server/errors/app-error";
import { fail, type Result } from "@/server/errors/result";
import type { DecisionName } from "../constants";
import { caseRefSchema, decisionSchema, reportSchema } from "../schemas";
import { assignOptions, decisionOptions } from "./decisions";
import { createReport } from "./reports";

export async function reportAction(input: unknown): Promise<Result<{ caseId: string }>> {
  return action({ schema: reportSchema, rateLimit: "report.create", handler: createReport })(input);
}

export async function decideAction(input: unknown): Promise<Result<{ caseId: string; decision: DecisionName }>> {
  // La décision choisit la permission : elle est validée avant de construire le pipeline.
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return fail(new AppError("VALIDATION").toPayload());
  const result = await adminAction(decisionOptions(parsed.data.decision))(parsed.data);
  if (result.ok) revalidatePath(`/admin/moderation/cases/${result.data.caseId}`);
  return result;
}

export async function assignCaseAction(input: unknown): Promise<Result<{ caseId: string }>> {
  const parsed = caseRefSchema.safeParse(input);
  if (!parsed.success) return fail(new AppError("VALIDATION").toPayload());
  const result = await adminAction(assignOptions)(parsed.data);
  if (result.ok) revalidatePath(`/admin/moderation/cases/${result.data.caseId}`);
  return result;
}
