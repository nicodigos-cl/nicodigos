"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineSearch } from "react-icons/hi";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SsrSearchInputProps = {
  /** Current `q` from the server/URL. */
  value: string;
  /** Build the href for a given query string (empty = clear search). */
  buildHref: (q: string | undefined) => string;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
  inputClassName?: string;
};

/**
 * Search field that navigates via URL (SSR list refresh).
 * Uses a div (not form) so it can nest inside product forms safely.
 */
export function SsrSearchInput({
  value,
  buildHref,
  placeholder = "Buscar...",
  "aria-label": ariaLabel = "Buscar",
  className,
  inputClassName,
}: SsrSearchInputProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit(nextRaw: string) {
    const next = nextRaw.trim();
    const href = buildHref(next || undefined);
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <div role="search" className={cn("relative min-w-0", className)}>
      <HiOutlineSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft.trim() !== value.trim()) {
            commit(draft);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft);
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn("h-9 pl-9", isPending && "opacity-80", inputClassName)}
      />
    </div>
  );
}
