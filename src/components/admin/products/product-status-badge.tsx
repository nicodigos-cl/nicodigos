import { Badge } from "@/components/ui/badge";
import type { VisualProductStatus } from "@/lib/products/status";
import { visualProductStatusLabel } from "@/lib/products/status";
import { cn } from "@/lib/utils";

const statusClassName: Record<VisualProductStatus, string> = {
  ACTIVE: "bg-primary/10 text-primary border-transparent",
  DRAFT: "bg-secondary text-secondary-foreground border-transparent",
  ARCHIVED: "bg-muted text-muted-foreground border-transparent",
  OUT_OF_STOCK: "bg-destructive/10 text-destructive border-transparent",
};

type ProductStatusBadgeProps = {
  status: VisualProductStatus;
  className?: string;
};

export function ProductStatusBadge({
  status,
  className,
}: ProductStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(statusClassName[status], className)}
    >
      {visualProductStatusLabel(status)}
    </Badge>
  );
}
