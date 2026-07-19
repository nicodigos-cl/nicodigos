import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const SHARED_BLOBS = [
  "absolute top-[-8%] left-[-10%] size-[14rem] sm:size-[36rem] rounded-full bg-primary/20 blur-2xl sm:blur-3xl",
  "absolute top-[18%] right-[-12%] size-[12rem] sm:size-[32rem] rounded-full bg-chart-1/25 blur-2xl sm:blur-3xl",
  "absolute top-[42%] left-[15%] size-[10rem] sm:size-[28rem] rounded-full bg-sidebar-accent/50 blur-2xl sm:blur-3xl",
  "absolute top-[58%] right-[8%] size-[12rem] sm:size-[30rem] rounded-full bg-primary/15 blur-2xl sm:blur-3xl",
  "absolute bottom-[-6%] left-[-6%] size-[14rem] sm:size-[34rem] rounded-full bg-chart-2/20 blur-2xl sm:blur-3xl",
  "absolute bottom-[12%] right-[-10%] size-[10rem] sm:size-[26rem] rounded-full bg-primary/18 blur-2xl sm:blur-3xl",
] as const;

type StoreProductBandsProps = {
  children: ReactNode;
  className?: string;
};

/** Shared ambient blobs behind consecutive product carousel bands. */
export function StoreProductBands({
  children,
  className,
}: StoreProductBandsProps) {
  return (
    <div className={cn("relative overflow-x-clip bg-background", className)}>
      <div aria-hidden className="hidden sm:block pointer-events-none absolute inset-0 z-10">
        {SHARED_BLOBS.map((blobClass, index) => (
          <div key={index} className={blobClass} />
        ))}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
