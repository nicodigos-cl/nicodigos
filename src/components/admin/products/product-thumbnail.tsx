import Image from "next/image";
import { HiOutlinePhotograph } from "react-icons/hi";

import { cn } from "@/lib/utils";

type ProductThumbnailProps = {
  src: string | null;
  alt: string;
  className?: string;
  size?: number;
};

export function ProductThumbnail({
  src,
  alt,
  className,
  size = 44,
}: ProductThumbnailProps) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <HiOutlinePhotograph className="size-4" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      className={cn(
        "size-11 shrink-0 rounded-xl border border-border object-cover",
        className,
      )}
    />
  );
}
