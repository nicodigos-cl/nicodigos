import { Badge } from "@/components/ui/badge";
import {
  userAccountStatusLabel,
  userRoleLabel,
} from "@/lib/validations/users";
import type { DerivedUserStatus } from "@/types/users";
import type { UserAccountStatus, UserRole } from "@/generated/prisma/enums";

const statusVariant: Record<
  DerivedUserStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "secondary",
  UNVERIFIED: "outline",
  RESTRICTED: "destructive",
  SUSPENDED: "destructive",
  ANONYMIZED: "outline",
  NEEDS_REVIEW: "destructive",
};

const derivedLabel: Record<DerivedUserStatus, string> = {
  ACTIVE: "Activa",
  UNVERIFIED: "Sin verificar",
  RESTRICTED: "Restringida",
  SUSPENDED: "Bloqueada",
  ANONYMIZED: "Anonimizada",
  NEEDS_REVIEW: "Requiere revisión",
};

export function UserRoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge variant={role === "ADMIN" ? "default" : "secondary"}>
      {userRoleLabel[role]}
    </Badge>
  );
}

export function UserStatusBadge({
  status,
  accountStatus,
}: {
  status: DerivedUserStatus;
  accountStatus?: UserAccountStatus;
}) {
  return (
    <Badge variant={statusVariant[status]}>
      {accountStatus && status === "ACTIVE"
        ? userAccountStatusLabel[accountStatus]
        : derivedLabel[status]}
    </Badge>
  );
}
