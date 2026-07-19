"use client";

import Link from "next/link";
import { HiArrowLeft } from "react-icons/hi";

import { cn } from "@/lib/utils";

type StoreProductBackButtonProps = {
  className?: string;
  href?: string;
};

export function StoreProductBackButton({
  className,
  href,
}: StoreProductBackButtonProps) {
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "rounded-full p-1.5 transition-all hover:bg-muted/80 active:scale-90 inline-flex items-center justify-center",
          className,
        )}
        aria-label="Volver"
      >
        <HiArrowLeft className="size-6 text-foreground" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className={cn(
        "rounded-full p-1.5 transition-all hover:bg-muted/80 active:scale-90",
        className,
      )}
      aria-label="Volver"
    >
      <HiArrowLeft className="size-6 text-foreground" />
    </button>
  );
}
