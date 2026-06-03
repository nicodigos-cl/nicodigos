import Image from "next/image";
import { cn } from "@/lib/utils";

type StoreProductCoverProps = {
  src: string | null;
  alt: string;
  className?: string;
  sizes?: string;
};

export function StoreProductCover({
  src,
  alt,
  className,
  sizes = "96px",
}: StoreProductCoverProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl bg-muted",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-muted-foreground">
          Sin imagen
        </div>
      )}
    </div>
  );
}
