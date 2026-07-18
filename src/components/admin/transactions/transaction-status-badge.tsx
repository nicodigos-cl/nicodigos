import { HiOutlineCheckCircle, HiOutlineClock, HiOutlineExclamationCircle, HiOutlineRefresh, HiOutlineXCircle } from "react-icons/hi";
import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/generated/prisma/enums";
import { paymentStatusLabel } from "@/lib/validations/transactions";
import { cn } from "@/lib/utils";

export function TransactionStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const Icon = status === "PAID" ? HiOutlineCheckCircle : status === "PENDING" || status === "PROCESSING" ? HiOutlineClock : status === "PARTIALLY_REFUNDED" || status === "REFUNDED" ? HiOutlineRefresh : status === "FAILED" || status === "REJECTED" ? HiOutlineXCircle : HiOutlineExclamationCircle;
  const variant = status === "PAID" ? "default" : status === "FAILED" || status === "REJECTED" ? "destructive" : "secondary";
  return (
    <Badge variant={variant} className={cn("gap-1", className)}>
      <Icon className="size-3.5" aria-hidden />
      {paymentStatusLabel[status]}
    </Badge>
  );
}
