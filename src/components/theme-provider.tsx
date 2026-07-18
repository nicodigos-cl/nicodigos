"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes injects an inline <script> to prevent theme flicker (FOUC).
// React 19 / Next 16 warn about <script> inside client components; the script
// still runs correctly during SSR — this is a known false positive.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args
      .map((arg) => (typeof arg === "string" ? arg : ""))
      .join(" ");
    if (message.includes("Encountered a script tag")) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
