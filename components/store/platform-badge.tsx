"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPlatformIconConfig } from "@/lib/store/platform-icons";
import { platformBadgeClass } from "@/lib/store/platform-styles";
import { cn } from "@/lib/utils";

type PlatformBadgeProps = {
  platform: string;
  className?: string;
  /** Muestra el nombre junto al icono (p. ej. detalle de producto). */
  showLabel?: boolean;
  size?: "sm" | "md";
};

const sizeConfig = {
  sm: {
    badge: "h-9 min-w-9 px-2.5 [&>svg]:!size-6",
    icon: "size-6",
  },
  md: {
    badge: "h-10 min-w-10 px-3 [&>svg]:!size-7",
    icon: "size-7",
  },
} as const;

export function PlatformBadge({
  platform,
  className,
  showLabel = false,
  size = "sm",
}: PlatformBadgeProps) {
  const { icon: Icon, label } = getPlatformIconConfig(platform);
  const config = sizeConfig[size];
  const tooltipText = platform.trim() || label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "inline-flex w-fit cursor-default items-center justify-center gap-1.5 rounded-lg border font-bold uppercase tracking-wider",
            config.badge,
            platformBadgeClass(platform),
            className,
          )}
        >
          <Icon className={cn(config.icon, "shrink-0")} aria-hidden />
          {showLabel ? (
            <span className="text-[10px] sm:text-xs">{label}</span>
          ) : (
            <span className="sr-only">{tooltipText}</span>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="font-medium">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}
