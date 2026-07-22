"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type HomeDeepLinkProps = {
  /** Element id to scroll into view on mount (e.g. offer-products). */
  scrollToId?: string | null;
};

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Scrolls to a home section via `?filtro=ofertas` or `#offer-products`. */
export function HomeDeepLink({ scrollToId }: HomeDeepLinkProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;

    const fromQuery = scrollToId?.trim();
    const fromHash =
      typeof window !== "undefined" && window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : null;
    const target = fromQuery || fromHash;
    if (!target) return;

    const frame = window.requestAnimationFrame(() => {
      scrollToSection(target);
    });

    function onHashChange() {
      const id = window.location.hash.replace(/^#/, "");
      if (id) scrollToSection(id);
    }

    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [pathname, scrollToId]);

  return null;
}
