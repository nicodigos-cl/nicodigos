import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo.webp";
const BRAND_NAME = "Nicodigos";

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 48,
} as const;

type LogoSize = keyof typeof sizeMap | number;

type LogoProps = {
  size?: LogoSize;
  /** Wrap in a link. Pass `false` for a plain mark. Defaults to `/`. */
  href?: string | false;
  className?: string;
  priority?: boolean;
};

function resolveSize(size: LogoSize): number {
  return typeof size === "number" ? size : sizeMap[size];
}

export function Logo({
  size = "md",
  href = "/",
  className,
  priority = false,
}: LogoProps) {
  const px = resolveSize(size);
  const isLinked = href !== false;

  const content = (
    <span className={cn("inline-flex shrink-0", className)}>
      <Image
        src={LOGO_SRC}
        alt=""
        width={px}
        height={px}
        priority={priority}
        className="object-contain"
        aria-hidden
      />
      <span className="sr-only">{BRAND_NAME}</span>
    </span>
  );

  if (!isLinked) {
    return content;
  }

  return (
    <Link
      href={href}
      className="inline-flex rounded-md outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
    >
      {content}
    </Link>
  );
}
