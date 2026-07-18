import { Badge } from "@/components/ui/badge";
import {
  toneToBadgeClass,
  type CustomerStatusTone,
} from "@/lib/customer-dashboard/status-tone";
import { cn } from "@/lib/utils";

export function CustomerStatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: CustomerStatusTone;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(toneToBadgeClass(tone), className)}
    >
      {label}
    </Badge>
  );
}
