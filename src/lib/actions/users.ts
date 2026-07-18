"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { UserAdminEventType } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { auth } from "@/lib/auth";
import { isAdminEmailByEnv } from "@/lib/auth/admin-allowlist";
import { requireAdminSession } from "@/lib/auth/session";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { buildUsersCsv } from "@/lib/users/export";
import { countActiveAdmins, getAdminUsers } from "@/lib/users/queries";
import {
  anonymizeUserSchema,
  changeUserRoleSchema,
  createUserAdminNoteSchema,
  deleteUserAdminNoteSchema,
  exportUsersSchema,
  markUserReviewSchema,
  reopenUserAdminNoteSchema,
  resolveUserAdminNoteSchema,
  resolveUserReviewSchema,
  restoreUserSchema,
  revokeAllUserSessionsSchema,
  revokeUserSessionSchema,
  sendEmailVerificationSchema,
  sendPasswordResetSchema,
  suspendUserSchema,
  unlinkOAuthAccountSchema,
  updateUserAdminNoteSchema,
  updateUserBillingSchema,
  updateUserProfileSchema,
  type UsersListQuery,
} from "@/lib/validations/users";

const log = createLogger({ module: "admin-users" });

function parseSubmission(rawInput: unknown): unknown {
  if (!(rawInput instanceof FormData)) return rawInput;
  const payload = rawInput.get("payload");
  if (typeof payload !== "string") return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function validationError(error: {
  flatten(): { fieldErrors: Record<string, string[]> };
}): ActionResult<never> {
  return {
    success: false,
    message: "Revisa los datos ingresados.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

function refresh(userId?: string) {
  revalidatePath("/admin/users");
  if (userId) revalidatePath(`/admin/users/${userId}`);
}

async function actor() {
  const session = await requireAdminSession();
  return { userId: session.user.id, email: session.user.email };
}

type SafeMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

async function appendUserEvent(input: {
  userId: string;
  type: UserAdminEventType;
  actor: { userId: string; email: string };
  message?: string;
  metadata?: SafeMetadata;
}) {
  await prisma.userAdminEvent.create({
    data: {
      userId: input.userId,
      type: input.type,
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
      message: input.message,
      metadata: input.metadata
        ? (Object.fromEntries(
            Object.entries(input.metadata).filter(
              ([, value]) =>
                value === null ||
                value === undefined ||
                ["string", "number", "boolean"].includes(typeof value),
            ),
          ) as PrismaJson)
        : undefined,
    },
  });
}

type PrismaJson = {
  [key: string]: string | number | boolean | null;
};

export async function updateUserProfileAction(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  const currentActor = await actor();
  const parsed = updateUserProfileSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, name: true, phone: true, accountStatus: true },
  });
  if (!user) return { success: false, message: "Usuario no encontrado." };
  if (user.accountStatus === "ANONYMIZED") {
    return { success: false, message: "No se puede editar un usuario anonimizado." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name, phone: parsed.data.phone },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: user.id,
        type: UserAdminEventType.PROFILE_UPDATED,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: parsed.data.reason,
        metadata: {
          nameBefore: user.name,
          nameAfter: parsed.data.name,
        },
      },
    });
  });

  log.info(
    {
      action: "updateUserProfile",
      userId: user.id,
      actor: currentActor.email,
      result: "success",
    },
    "User profile updated",
  );
  refresh(user.id);
  return { success: true, data: { userId: user.id } };
}

export async function updateUserBillingAction(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  const currentActor = await actor();
  const parsed = updateUserBillingSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, accountStatus: true, invoiceType: true, rut: true },
  });
  if (!user) return { success: false, message: "Usuario no encontrado." };
  if (user.accountStatus === "ANONYMIZED") {
    return { success: false, message: "No se puede editar un usuario anonimizado." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        rut: parsed.data.rut,
        invoiceType: parsed.data.invoiceType,
        businessName: parsed.data.businessName,
        businessActivity: parsed.data.businessActivity,
        addressLine1: parsed.data.addressLine1,
        addressLine2: parsed.data.addressLine2,
        commune: parsed.data.commune,
        city: parsed.data.city,
        region: parsed.data.region,
      },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: user.id,
        type: UserAdminEventType.BILLING_UPDATED,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: parsed.data.reason,
        metadata: {
          invoiceTypeBefore: user.invoiceType,
          invoiceTypeAfter: parsed.data.invoiceType,
          hadRut: Boolean(user.rut),
          hasRut: Boolean(parsed.data.rut),
        },
      },
    });
  });

  log.info(
    {
      action: "updateUserBilling",
      userId: user.id,
      actor: currentActor.email,
      result: "success",
    },
    "User billing updated",
  );
  refresh(user.id);
  return { success: true, data: { userId: user.id } };
}

export async function changeUserRoleAction(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string; role: string }>> {
  const currentActor = await actor();
  const parsed = changeUserRoleSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      email: true,
      role: true,
      accountStatus: true,
    },
  });
  if (!user) return { success: false, message: "Usuario no encontrado." };
  if (user.accountStatus === "ANONYMIZED") {
    return { success: false, message: "No se puede cambiar el rol de un usuario anonimizado." };
  }
  if (user.role === parsed.data.role) {
    return { success: false, message: "El usuario ya tiene ese rol." };
  }
  if (user.id === currentActor.userId && parsed.data.role === "USER") {
    return {
      success: false,
      message: "No puedes quitarte tu propio rol de administrador.",
    };
  }

  if (user.role === "ADMIN" && parsed.data.role === "USER") {
    const activeAdmins = await countActiveAdmins();
    if (activeAdmins <= 1) {
      return {
        success: false,
        message: "No puedes degradar al último administrador activo.",
      };
    }
  }

  if (
    parsed.data.role === "USER" &&
    isAdminEmailByEnv(user.email)
  ) {
    return {
      success: false,
      message:
        "Este email está en ADMIN_EMAILS y volvería a ascender en el próximo inicio de sesión. Quítalo de la allowlist antes de degradarlo.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { role: parsed.data.role },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: user.id,
        type: UserAdminEventType.ROLE_CHANGED,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: parsed.data.reason,
        metadata: {
          roleBefore: user.role,
          roleAfter: parsed.data.role,
        },
      },
    });
  });

  log.info(
    {
      action: "changeUserRole",
      userId: user.id,
      actor: currentActor.email,
      roleBefore: user.role,
      roleAfter: parsed.data.role,
      result: "success",
    },
    "User role changed",
  );
  refresh(user.id);
  return { success: true, data: { userId: user.id, role: parsed.data.role } };
}

export async function suspendUserAction(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string; accountStatus: string }>> {
  const currentActor = await actor();
  const parsed = suspendUserSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      role: true,
      accountStatus: true,
      email: true,
    },
  });
  if (!user) return { success: false, message: "Usuario no encontrado." };
  if (user.accountStatus === "ANONYMIZED") {
    return { success: false, message: "El usuario ya está anonimizado." };
  }
  if (user.id === currentActor.userId) {
    return { success: false, message: "No puedes suspender tu propia cuenta." };
  }
  if (user.role === "ADMIN") {
    const activeAdmins = await countActiveAdmins();
    if (activeAdmins <= 1) {
      return {
        success: false,
        message: "No puedes suspender al último administrador activo.",
      };
    }
  }

  const nextStatus = parsed.data.mode;
  const eventType =
    nextStatus === "RESTRICTED"
      ? UserAdminEventType.ACCOUNT_RESTRICTED
      : UserAdminEventType.ACCOUNT_SUSPENDED;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        accountStatus: nextStatus,
        suspensionReason: parsed.data.reason,
        suspendedAt: new Date(),
        suspendedByUserId: currentActor.userId,
        suspensionEndsAt: parsed.data.endsAt
          ? new Date(parsed.data.endsAt)
          : null,
      },
    });
    if (parsed.data.revokeSessions) {
      await tx.session.deleteMany({ where: { userId: user.id } });
    }
    await tx.userAdminEvent.create({
      data: {
        userId: user.id,
        type: eventType,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: parsed.data.reason,
        metadata: {
          statusBefore: user.accountStatus,
          statusAfter: nextStatus,
          revokeSessions: parsed.data.revokeSessions,
        },
      },
    });
  });

  log.info(
    {
      action: "suspendUser",
      userId: user.id,
      actor: currentActor.email,
      statusBefore: user.accountStatus,
      statusAfter: nextStatus,
      result: "success",
    },
    "User access restricted",
  );
  refresh(user.id);
  return {
    success: true,
    data: { userId: user.id, accountStatus: nextStatus },
  };
}

export async function restoreUserAction(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  const currentActor = await actor();
  const parsed = restoreUserSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, accountStatus: true },
  });
  if (!user) return { success: false, message: "Usuario no encontrado." };
  if (user.accountStatus === "ANONYMIZED") {
    return { success: false, message: "No se puede rehabilitar un usuario anonimizado." };
  }
  if (user.accountStatus === "ACTIVE") {
    return { success: false, message: "La cuenta ya está activa." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        accountStatus: "ACTIVE",
        suspensionReason: null,
        suspendedAt: null,
        suspendedByUserId: null,
        suspensionEndsAt: null,
      },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: user.id,
        type: UserAdminEventType.ACCOUNT_RESTORED,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: parsed.data.reason,
        metadata: {
          statusBefore: user.accountStatus,
          statusAfter: "ACTIVE",
        },
      },
    });
  });

  log.info(
    {
      action: "restoreUser",
      userId: user.id,
      actor: currentActor.email,
      statusBefore: user.accountStatus,
      statusAfter: "ACTIVE",
      result: "success",
    },
    "User access restored",
  );
  refresh(user.id);
  return { success: true, data: { userId: user.id } };
}

export async function revokeUserSessionAction(
  rawInput: unknown,
): Promise<ActionResult<{ sessionId: string }>> {
  const currentActor = await actor();
  const parsed = revokeUserSessionSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const session = await prisma.session.findFirst({
    where: { id: parsed.data.sessionId, userId: parsed.data.userId },
    select: { id: true, userId: true },
  });
  if (!session) {
    return { success: false, message: "Sesión no encontrada." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.session.delete({ where: { id: session.id } });
    await tx.userAdminEvent.create({
      data: {
        userId: session.userId,
        type: UserAdminEventType.SESSION_REVOKED,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: parsed.data.reason,
        metadata: { sessionIdPrefix: session.id.slice(0, 8) },
      },
    });
  });

  log.info(
    {
      action: "revokeUserSession",
      userId: session.userId,
      actor: currentActor.email,
      result: "success",
    },
    "User session revoked",
  );
  refresh(session.userId);
  return { success: true, data: { sessionId: session.id } };
}

export async function revokeAllUserSessionsAction(
  rawInput: unknown,
): Promise<ActionResult<{ revoked: number }>> {
  const currentActor = await actor();
  const parsed = revokeAllUserSessionsSchema.safeParse(
    parseSubmission(rawInput),
  );
  if (!parsed.success) return validationError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true },
  });
  if (!user) return { success: false, message: "Usuario no encontrado." };

  const currentSession = parsed.data.keepCurrentAdminSession
    ? await auth.api.getSession({ headers: await headers() })
    : null;

  const result = await prisma.$transaction(async (tx) => {
    const deleted = await tx.session.deleteMany({
      where: {
        userId: user.id,
        ...(currentSession?.session.id &&
        currentSession.user.id === user.id &&
        parsed.data.keepCurrentAdminSession
          ? { id: { not: currentSession.session.id } }
          : {}),
      },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: user.id,
        type: UserAdminEventType.SESSIONS_REVOKED_ALL,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: parsed.data.reason,
        metadata: {
          revoked: deleted.count,
          keptCurrent: Boolean(parsed.data.keepCurrentAdminSession),
        },
      },
    });
    return deleted.count;
  });

  log.info(
    {
      action: "revokeAllUserSessions",
      userId: user.id,
      actor: currentActor.email,
      result: "success",
    },
    "All user sessions revoked",
  );
  refresh(user.id);
  return { success: true, data: { revoked: result } };
}

export async function sendPasswordResetAction(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  const currentActor = await actor();
  const parsed = sendPasswordResetSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      email: true,
      accountStatus: true,
      accounts: { select: { password: true }, take: 10 },
    },
  });
  if (!user) return { success: false, message: "Usuario no encontrado." };
  if (user.accountStatus === "ANONYMIZED" || user.accountStatus === "SUSPENDED") {
    return {
      success: false,
      message: "No se puede enviar restablecimiento a esta cuenta en su estado actual.",
    };
  }
  if (!user.accounts.some((account) => account.password)) {
    return {
      success: false,
      message: "Esta cuenta no tiene contraseña local; usa un proveedor OAuth.",
    };
  }

  try {
    await auth.api.sendVerificationOTP({
      body: { email: user.email, type: "forget-password" },
    });
  } catch {
    return {
      success: false,
      message: "No se pudo enviar el correo de restablecimiento.",
    };
  }

  await appendUserEvent({
    userId: user.id,
    type: UserAdminEventType.PASSWORD_RESET_SENT,
    actor: currentActor,
    message: parsed.data.reason,
  });

  log.info(
    {
      action: "sendPasswordReset",
      userId: user.id,
      actor: currentActor.email,
      result: "success",
    },
    "Password reset OTP requested",
  );
  refresh(user.id);
  return { success: true, data: { userId: user.id } };
}

export async function sendEmailVerificationAction(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  const currentActor = await actor();
  const parsed = sendEmailVerificationSchema.safeParse(
    parseSubmission(rawInput),
  );
  if (!parsed.success) return validationError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, email: true, emailVerified: true, accountStatus: true },
  });
  if (!user) return { success: false, message: "Usuario no encontrado." };
  if (user.emailVerified) {
    return { success: false, message: "El email ya está verificado." };
  }
  if (user.accountStatus === "ANONYMIZED") {
    return { success: false, message: "Usuario anonimizado." };
  }

  try {
    await auth.api.sendVerificationOTP({
      body: { email: user.email, type: "email-verification" },
    });
  } catch {
    return {
      success: false,
      message: "No se pudo enviar el correo de verificación.",
    };
  }

  await appendUserEvent({
    userId: user.id,
    type: UserAdminEventType.EMAIL_VERIFICATION_SENT,
    actor: currentActor,
    message: parsed.data.reason,
  });

  log.info(
    {
      action: "sendEmailVerification",
      userId: user.id,
      actor: currentActor.email,
      result: "success",
    },
    "Email verification OTP requested",
  );
  refresh(user.id);
  return { success: true, data: { userId: user.id } };
}

export async function createUserAdminNoteAction(
  rawInput: unknown,
): Promise<ActionResult<{ noteId: string }>> {
  const currentActor = await actor();
  const parsed = createUserAdminNoteSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true },
  });
  if (!user) return { success: false, message: "Usuario no encontrado." };

  const note = await prisma.$transaction(async (tx) => {
    const created = await tx.userAdminNote.create({
      data: {
        userId: user.id,
        authorUserId: currentActor.userId,
        authorEmail: currentActor.email,
        category: parsed.data.category,
        priority: parsed.data.priority,
        content: parsed.data.content,
      },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: user.id,
        type: UserAdminEventType.NOTE_ADDED,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: `Nota ${parsed.data.category}`,
        metadata: { noteId: created.id, category: parsed.data.category },
      },
    });
    return created;
  });

  refresh(user.id);
  return { success: true, data: { noteId: note.id } };
}

export async function updateUserAdminNoteAction(
  rawInput: unknown,
): Promise<ActionResult<{ noteId: string }>> {
  const currentActor = await actor();
  const parsed = updateUserAdminNoteSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const note = await prisma.userAdminNote.findUnique({
    where: { id: parsed.data.noteId },
    select: { id: true, userId: true },
  });
  if (!note) return { success: false, message: "Nota no encontrada." };

  await prisma.$transaction(async (tx) => {
    await tx.userAdminNote.update({
      where: { id: note.id },
      data: {
        category: parsed.data.category,
        priority: parsed.data.priority,
        content: parsed.data.content,
      },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: note.userId,
        type: UserAdminEventType.NOTE_UPDATED,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: "Nota actualizada",
        metadata: { noteId: note.id },
      },
    });
  });

  refresh(note.userId);
  return { success: true, data: { noteId: note.id } };
}

export async function resolveUserAdminNoteAction(
  rawInput: unknown,
): Promise<ActionResult<{ noteId: string }>> {
  const currentActor = await actor();
  const parsed = resolveUserAdminNoteSchema.safeParse(
    parseSubmission(rawInput),
  );
  if (!parsed.success) return validationError(parsed.error);

  const note = await prisma.userAdminNote.findUnique({
    where: { id: parsed.data.noteId },
    select: { id: true, userId: true, resolvedAt: true },
  });
  if (!note) return { success: false, message: "Nota no encontrada." };
  if (note.resolvedAt) {
    return { success: false, message: "La nota ya está resuelta." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.userAdminNote.update({
      where: { id: note.id },
      data: { resolvedAt: new Date() },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: note.userId,
        type: UserAdminEventType.NOTE_RESOLVED,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: "Nota resuelta",
        metadata: { noteId: note.id },
      },
    });
  });

  refresh(note.userId);
  return { success: true, data: { noteId: note.id } };
}

export async function reopenUserAdminNoteAction(
  rawInput: unknown,
): Promise<ActionResult<{ noteId: string }>> {
  const currentActor = await actor();
  const parsed = reopenUserAdminNoteSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const note = await prisma.userAdminNote.findUnique({
    where: { id: parsed.data.noteId },
    select: { id: true, userId: true, resolvedAt: true },
  });
  if (!note) return { success: false, message: "Nota no encontrada." };
  if (!note.resolvedAt) {
    return { success: false, message: "La nota ya está abierta." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.userAdminNote.update({
      where: { id: note.id },
      data: { resolvedAt: null },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: note.userId,
        type: UserAdminEventType.NOTE_REOPENED,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: "Nota reabierta",
        metadata: { noteId: note.id },
      },
    });
  });

  refresh(note.userId);
  return { success: true, data: { noteId: note.id } };
}

export async function deleteUserAdminNoteAction(
  rawInput: unknown,
): Promise<ActionResult<{ noteId: string }>> {
  const currentActor = await actor();
  const parsed = deleteUserAdminNoteSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const note = await prisma.userAdminNote.findUnique({
    where: { id: parsed.data.noteId },
    select: { id: true, userId: true, category: true },
  });
  if (!note) return { success: false, message: "Nota no encontrada." };

  await prisma.$transaction(async (tx) => {
    await tx.userAdminNote.delete({ where: { id: note.id } });
    await tx.userAdminEvent.create({
      data: {
        userId: note.userId,
        type: UserAdminEventType.NOTE_DELETED,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: "Nota eliminada",
        metadata: { noteId: note.id, category: note.category },
      },
    });
  });

  refresh(note.userId);
  return { success: true, data: { noteId: note.id } };
}

export async function markUserReviewAction(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  const currentActor = await actor();
  const parsed = markUserReviewSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true },
  });
  if (!user) return { success: false, message: "Usuario no encontrado." };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { requiresReview: true, reviewReason: parsed.data.reason },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: user.id,
        type: UserAdminEventType.REVIEW_MARKED,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: parsed.data.reason,
      },
    });
  });

  refresh(user.id);
  return { success: true, data: { userId: user.id } };
}

export async function resolveUserReviewAction(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  const currentActor = await actor();
  const parsed = resolveUserReviewSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, requiresReview: true },
  });
  if (!user) return { success: false, message: "Usuario no encontrado." };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { requiresReview: false, reviewReason: null },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: user.id,
        type: UserAdminEventType.REVIEW_RESOLVED,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: parsed.data.reason,
      },
    });
  });

  refresh(user.id);
  return { success: true, data: { userId: user.id } };
}

export async function unlinkOAuthAccountAction(
  rawInput: unknown,
): Promise<ActionResult<{ accountId: string }>> {
  const currentActor = await actor();
  const parsed = unlinkOAuthAccountSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId: parsed.data.userId },
    select: {
      id: true,
      userId: true,
      providerId: true,
      password: true,
    },
  });
  if (!account) return { success: false, message: "Cuenta no encontrada." };
  if (account.password) {
    return {
      success: false,
      message: "No se puede desvincular la cuenta de contraseña local.",
    };
  }

  const remaining = await prisma.account.count({
    where: { userId: account.userId, id: { not: account.id } },
  });
  if (remaining === 0) {
    return {
      success: false,
      message: "No puedes dejar al usuario sin ningún método de acceso.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.account.delete({ where: { id: account.id } });
    await tx.userAdminEvent.create({
      data: {
        userId: account.userId,
        type: UserAdminEventType.OAUTH_UNLINKED,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: parsed.data.reason,
        metadata: { providerId: account.providerId },
      },
    });
  });

  refresh(account.userId);
  return { success: true, data: { accountId: account.id } };
}

export async function anonymizeUserAction(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  const currentActor = await actor();
  const parsed = anonymizeUserSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      role: true,
      accountStatus: true,
      email: true,
      _count: { select: { orders: true } },
    },
  });
  if (!user) return { success: false, message: "Usuario no encontrado." };
  if (user.id === currentActor.userId) {
    return { success: false, message: "No puedes anonimizar tu propia cuenta." };
  }
  if (user.role === "ADMIN") {
    return {
      success: false,
      message: "No se pueden anonimizar cuentas administradoras.",
    };
  }
  if (user.accountStatus === "ANONYMIZED") {
    return { success: false, message: "El usuario ya está anonimizado." };
  }

  const anonymizedEmail = `anon-${user.id.slice(0, 12)}@anonymized.local`;

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.account.deleteMany({ where: { userId: user.id } });
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: "Usuario anonimizado",
        email: anonymizedEmail,
        emailVerified: false,
        image: null,
        phone: null,
        rut: null,
        businessName: null,
        businessActivity: null,
        addressLine1: null,
        addressLine2: null,
        commune: null,
        city: null,
        region: null,
        role: "USER",
        accountStatus: "ANONYMIZED",
        anonymizedAt: new Date(),
        suspensionReason: parsed.data.reason,
        suspendedAt: new Date(),
        suspendedByUserId: currentActor.userId,
        requiresReview: false,
        reviewReason: null,
      },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: user.id,
        type: UserAdminEventType.ANONYMIZED,
        actorUserId: currentActor.userId,
        actorEmail: currentActor.email,
        message: parsed.data.reason,
        metadata: {
          hadOrders: user._count.orders > 0,
          previousEmailDomain: user.email.includes("@")
            ? user.email.split("@")[1]
            : null,
        },
      },
    });
  });

  log.info(
    {
      action: "anonymizeUser",
      userId: user.id,
      actor: currentActor.email,
      result: "success",
    },
    "User anonymized",
  );
  refresh(user.id);
  return { success: true, data: { userId: user.id } };
}

export async function exportUsersAction(
  rawInput: unknown,
): Promise<ActionResult<{ filename: string; content: string }>> {
  await actor();
  const parsed = exportUsersSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const { page: _page, pageSize: _pageSize, confirmation: _confirmation, ...filters } =
    parsed.data;
  void _page;
  void _pageSize;
  void _confirmation;

  const exportQuery: UsersListQuery = {
    ...filters,
    page: 1,
    pageSize: 100,
  };

  const chunks: Awaited<ReturnType<typeof getAdminUsers>>["items"] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await getAdminUsers({ ...exportQuery, page, pageSize: 100 });
    chunks.push(...result.items);
    totalPages = result.totalPages;
    page += 1;
  } while (page <= totalPages && page <= 50);

  const content = buildUsersCsv(chunks);
  const filename = `usuarios-nicodigos-${new Date().toISOString().slice(0, 10)}.csv`;

  log.info(
    {
      action: "exportUsers",
      result: "success",
      rowCount: chunks.length,
    },
    "Users exported",
  );

  return { success: true, data: { filename, content } };
}
