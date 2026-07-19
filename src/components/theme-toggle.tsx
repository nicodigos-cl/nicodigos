"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { HiOutlineMoon, HiOutlineSun } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "rounded-xl h-10 w-10 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200",
        className,
      )}
      aria-label={
        mounted
          ? isDark
            ? "Cambiar a tema claro"
            : "Cambiar a tema oscuro"
          : "Cambiar tema"
      }
      onClick={() => {
        if (!mounted) return;
        setTheme(isDark ? "light" : "dark");
      }}
    >
      {isDark ? (
        <HiOutlineSun className="size-5 text-sidebar-foreground" />
      ) : (
        <HiOutlineMoon className="size-5 text-sidebar-foreground" />
      )}
    </Button>
  );
}
