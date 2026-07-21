"use client";

import { HiOutlineSparkles } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TranslateFieldButtonProps = {
  label?: string;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  size?: "xs" | "sm";
};

export function TranslateFieldButton({
  label = "Traducir",
  busy,
  disabled,
  onClick,
  className,
  size = "xs",
}: TranslateFieldButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn("h-7 gap-1 px-2 text-xs", className)}
      disabled={disabled || busy}
      onClick={onClick}
    >
      <HiOutlineSparkles className="size-3.5" />
      {busy ? "Traduciendo…" : label}
    </Button>
  );
}
