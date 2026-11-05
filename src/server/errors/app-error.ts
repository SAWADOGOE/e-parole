export const APP_ERROR_CODES = [
  "UNAUTHENTICATED",
  "EMAIL_NOT_VERIFIED",
  "MFA_REQUIRED",
  "REAUTH_REQUIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL",
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export type FieldErrors = Record<string, string[]>;

export interface AppErrorPayload {
  code: AppErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
  retryAfterSeconds?: number;
  requestId?: string;
}

const DEFAULT_MESSAGES: Record<AppErrorCode, string> = {
  UNAUTHENTICATED: "Connecte-toi pour continuer.",
  EMAIL_NOT_VERIFIED: "Vérifie ton adresse email pour continuer.",
  MFA_REQUIRED: "La double authentification est requise pour cet espace.",
  REAUTH_REQUIRED: "Confirme ton identité pour effectuer cette action.",
  FORBIDDEN: "Tu n'as pas l'autorisation d'effectuer cette action.",
  NOT_FOUND: "Cette page est introuvable.",
  VALIDATION: "Certaines informations sont invalides.",
  CONFLICT: "Cette ressource existe déjà.",
  RATE_LIMITED: "Patiente un instant avant de réessayer.",
  INTERNAL: "Une erreur inattendue est survenue.",
};

export const HTTP_STATUS: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  EMAIL_NOT_VERIFIED: 403,
  MFA_REQUIRED: 403,
  REAUTH_REQUIRED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fieldErrors: FieldErrors | undefined;
  readonly retryAfterSeconds: number | undefined;

  constructor(
    code: AppErrorCode,
    options: { message?: string; fieldErrors?: FieldErrors; retryAfterSeconds?: number; cause?: unknown } = {},
  ) {
    super(options.message ?? DEFAULT_MESSAGES[code], { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = options.fieldErrors;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }

  toPayload(requestId?: string): AppErrorPayload {
    return {
      code: this.code,
      message: this.message,
      ...(this.fieldErrors ? { fieldErrors: this.fieldErrors } : {}),
      ...(this.retryAfterSeconds !== undefined ? { retryAfterSeconds: this.retryAfterSeconds } : {}),
      ...(requestId ? { requestId } : {}),
    };
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export function defaultMessage(code: AppErrorCode): string {
  return DEFAULT_MESSAGES[code];
}
