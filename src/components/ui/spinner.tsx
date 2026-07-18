import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const { strokeWidth = 2 } = props;
  return (
    <HugeiconsIcon
      icon={Loading03Icon}
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
      strokeWidth={
        typeof strokeWidth === "number"
          ? strokeWidth
          : Number(strokeWidth) === 0
            ? 2
            : Number(strokeWidth)
      }
    />
  );
}

export { Spinner };
