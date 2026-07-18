import { cn } from "@/lib/utils";

export function AuthDivider({
  label = "O continúa con",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div aria-hidden="true" className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-sm font-medium">
        <span className="bg-background px-6 text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}
