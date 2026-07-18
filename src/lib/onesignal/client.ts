"use client";

import OneSignal from "react-onesignal";

let initialization: Promise<void> | null = null;

export function initializeOneSignal(): Promise<void> {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId) return Promise.reject(new Error("ONESIGNAL_APP_ID_MISSING"));
  initialization ??= OneSignal.init({
    appId,
    allowLocalhostAsSecureOrigin: process.env.NODE_ENV !== "production",
    serviceWorkerPath: "push/onesignal/OneSignalSDKWorker.js",
    serviceWorkerParam: { scope: "/push/onesignal/" },
    promptOptions: { slidedown: { prompts: [{ type: "push", autoPrompt: false, delay: { pageViews: 99, timeDelay: 86_400 } }] } },
    notifyButton: { enable: false, prenotify: false, position: "bottom-right", showCredit: false, offset: { bottom: "0px", left: "0px", right: "0px" }, text: { "tip.state.unsubscribed": "Activar notificaciones", "tip.state.subscribed": "Notificaciones activas", "tip.state.blocked": "Notificaciones bloqueadas", "message.prenotify": "", "message.action.subscribing": "Activando…", "message.action.subscribed": "Suscripción activa", "message.action.resubscribed": "Suscripción reactivada", "message.action.unsubscribed": "Suscripción desactivada", "dialog.main.title": "Notificaciones", "dialog.main.button.subscribe": "Activar", "dialog.main.button.unsubscribe": "Desactivar", "dialog.blocked.title": "Permiso bloqueado", "dialog.blocked.message": "Habilita las notificaciones en la configuración del navegador." } },
  });
  return initialization;
}

export async function logoutOneSignal(): Promise<void> {
  if (!initialization) return;
  try { await initialization; await OneSignal.logout(); } catch { /* logout must continue even if push is unavailable */ }
}

export { OneSignal };
