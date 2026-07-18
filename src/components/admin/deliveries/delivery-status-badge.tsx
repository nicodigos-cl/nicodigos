import { Badge } from "@/components/ui/badge";
import {
  deliveryStatusLabel,
  type DeliveryStatus,
} from "@/lib/validations/deliveries";
import { cn } from "@/lib/utils";

const statusClassName: Record<DeliveryStatus, string> = {
  PENDING: "bg-secondary text-secondary-foreground border-transparent",
  PROCESSING: "bg-chart-2/15 text-chart-2 border-transparent",
  DELIVERED: "bg-primary/10 text-primary border-transparent",
  FAILED: "bg-destructive/10 text-destructive border-transparent",
  CANCELED: "bg-muted text-muted-foreground border-transparent",
};

export function DeliveryStatusBadge({
  status,
  className,
}: {
  status: DeliveryStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(statusClassName[status], className)}
      aria-label={`Estado: ${deliveryStatusLabel[status]}`}
    >
      {deliveryStatusLabel[status]}
    </Badge>
  );
}
