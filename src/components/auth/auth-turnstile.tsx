"use client";

import {
  Turnstile,
  type TurnstileInstance,
  type TurnstileProps,
} from "@marsidev/react-turnstile";
import { forwardRef, useCallback } from "react";

import { turnstileSiteKey } from "@/lib/turnstile";
import { cn } from "@/lib/utils";

type AuthTurnstileProps = {
  onTokenChange: (token: string | null) => void;
  className?: string;
  options?: TurnstileProps["options"];
};

export const AuthTurnstile = forwardRef<TurnstileInstance, AuthTurnstileProps>(
  function AuthTurnstile({ onTokenChange, className, options }, ref) {
    const handleSuccess = useCallback(
      (token: string) => {
        onTokenChange(token);
      },
      [onTokenChange],
    );

    const handleClear = useCallback(() => {
      onTokenChange(null);
    }, [onTokenChange]);

    return (
      <div className={cn("flex w-full justify-center overflow-hidden", className)}>
        <Turnstile
          ref={ref}
          siteKey={turnstileSiteKey}
          options={{
            theme: "auto",
            size: "flexible",
            language: "es",
            ...options,
          }}
          rerenderOnCallbackChange
          onSuccess={handleSuccess}
          onExpire={handleClear}
          onError={handleClear}
          onTimeout={handleClear}
        />
      </div>
    );
  },
);
