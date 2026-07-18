"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { syncWebPushSubscriptionAction } from "@/lib/actions/communication-preferences";
import { initializeOneSignal, OneSignal } from "@/lib/onesignal/client";

type PushState = "unsupported" | "blocked" | "inactive" | "active" | "unavailable";
type PushContextValue = { state: PushState; pending: boolean; requestPermission: () => Promise<void>; disable: () => Promise<void> };
const PushContext = createContext<PushContextValue>({ state: "unavailable", pending: false, requestPermission: async () => undefined, disable: async () => undefined });

function permissionStatus(state: PushState) {
  return state === "unsupported" ? "UNSUPPORTED" as const : state === "blocked" ? "DENIED" as const : state === "active" ? "GRANTED" as const : state === "unavailable" ? "UNAVAILABLE" as const : "DEFAULT" as const;
}

export function OneSignalProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [state, setState] = useState<PushState>(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ? "inactive" : "unavailable");
  const [pending, setPending] = useState(false);

  const synchronize = useCallback(async () => {
    const supported = OneSignal.Notifications.isPushSupported();
    if (!supported) { setState("unsupported"); return; }
    const permission = OneSignal.Notifications.permissionNative;
    const optedIn = Boolean(OneSignal.User.PushSubscription.optedIn);
    const next: PushState = permission === "denied" ? "blocked" : permission === "granted" && optedIn ? "active" : "inactive";
    setState(next);
    await syncWebPushSubscriptionAction({ permissionStatus: permissionStatus(next), optedIn, subscriptionId: OneSignal.User.PushSubscription.id ?? null, browser: navigator.userAgent.slice(0, 80), platform: navigator.platform?.slice(0, 80) });
  }, []);

  useEffect(() => {
    let active = true;
    const onSubscriptionChange = () => { if (active) void synchronize(); };
    void initializeOneSignal().then(async () => {
      if (!active) return;
      await OneSignal.login(userId);
      OneSignal.User.PushSubscription.addEventListener("change", onSubscriptionChange);
      OneSignal.Notifications.addEventListener("permissionChange", onSubscriptionChange);
      await synchronize();
    }).catch(() => { if (active) setState("unavailable"); });
    return () => {
      active = false;
      try { OneSignal.User.PushSubscription.removeEventListener("change", onSubscriptionChange); OneSignal.Notifications.removeEventListener("permissionChange", onSubscriptionChange); } catch { /* SDK may not be initialized */ }
    };
  }, [synchronize, userId]);

  const requestPermission = useCallback(async () => {
    setPending(true);
    try { await initializeOneSignal(); await OneSignal.Notifications.requestPermission(); if (OneSignal.Notifications.permissionNative === "granted") await OneSignal.User.PushSubscription.optIn(); await synchronize(); }
    finally { setPending(false); }
  }, [synchronize]);
  const disable = useCallback(async () => {
    setPending(true);
    try { await initializeOneSignal(); await OneSignal.User.PushSubscription.optOut(); await synchronize(); }
    finally { setPending(false); }
  }, [synchronize]);
  const value = useMemo(() => ({ state, pending, requestPermission, disable }), [state, pending, requestPermission, disable]);
  return <PushContext.Provider value={value}>{children}</PushContext.Provider>;
}

export function useWebPush() { return useContext(PushContext); }
