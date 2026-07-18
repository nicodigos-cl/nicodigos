import { Badge } from "@/components/ui/badge";
import {
  orderStatusLabel,
  paymentStatusLabel,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/validations/orders";
import { cn } from "@/lib/utils";

const orderStatusClassName: Record<OrderStatus, string> = {
  PENDING: "bg-secondary text-secondary-foreground border-transparent",
  PAID: "bg-primary/10 text-primary border-transparent",
  PROCESSING: "bg-chart-2/15 text-chart-2 border-transparent",
  FULFILLED: "bg-primary/10 text-primary border-transparent",
  PARTIALLY_FULFILLED: "bg-chart-1/15 text-chart-1 border-transparent",
  CANCELED: "bg-muted text-muted-foreground border-transparent",
  REFUNDED: "bg-destructive/10 text-destructive border-transparent",
};

const paymentStatusClassName: Record<PaymentStatus, string> = {
  PENDING: "bg-secondary text-secondary-foreground border-transparent",
  PAID: "bg-primary/10 text-primary border-transparent",
  FAILED: "bg-destructive/10 text-destructive border-transparent",
  REFUNDED: "bg-muted text-muted-foreground border-transparent",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(orderStatusClassName[status], className)}
    >
      {orderStatusLabel[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(paymentStatusClassName[status], className)}
    >
      {paymentStatusLabel[status]}
    </Badge>
  );
}
