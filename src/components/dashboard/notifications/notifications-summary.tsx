import {
  HiOutlineBell,
  HiOutlineMail,
  HiOutlineShieldCheck,
  HiOutlineSpeakerphone,
} from "react-icons/hi";

import type { PreferenceInput } from "@/lib/validations/communications";
import { cn } from "@/lib/utils";

type NotificationsSummaryProps = {
  preferences: PreferenceInput;
};

const cards = [
  {
    key: "webPush" as const,
    title: "Push web",
    icon: HiOutlineBell,
    getValue: (prefs: PreferenceInput) =>
      prefs.webPushEnabled ? "Activado" : "Desactivado",
    getHint: (prefs: PreferenceInput) =>
      prefs.webPushEnabled
        ? "Puedes recibir alertas en este navegador"
        : "Actívalo para avisos instantáneos",
    tone: (prefs: PreferenceInput) =>
      prefs.webPushEnabled ? "success" : "muted",
  },
  {
    key: "marketingEmail" as const,
    title: "Email marketing",
    icon: HiOutlineMail,
    getValue: (prefs: PreferenceInput) =>
      prefs.marketingEmail ? "Suscrito" : "No suscrito",
    getHint: () => "No afecta emails operacionales",
    tone: (prefs: PreferenceInput) =>
      prefs.marketingEmail ? "success" : "muted",
  },
  {
    key: "operational" as const,
    title: "Alertas operativas",
    icon: HiOutlineShieldCheck,
    getValue: (prefs: PreferenceInput) => {
      const enabled = [
        prefs.orders,
        prefs.payments,
        prefs.deliveries,
        prefs.smm,
      ].filter(Boolean).length;
      return `${enabled}/4 activas`;
    },
    getHint: () => "Pedidos, pagos, entregas y SMM",
    tone: () => "info" as const,
  },
  {
    key: "marketing" as const,
    title: "Marketing",
    icon: HiOutlineSpeakerphone,
    getValue: (prefs: PreferenceInput) => {
      const enabled = [prefs.newProducts, prefs.promotions].filter(
        Boolean,
      ).length;
      return `${enabled}/2 activas`;
    },
    getHint: () => "Productos nuevos y promociones",
    tone: (prefs: PreferenceInput) =>
      prefs.newProducts || prefs.promotions ? "success" : "muted",
  },
] as const;

function toneClass(tone: "success" | "info" | "muted") {
  switch (tone) {
    case "success":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "info":
      return "bg-primary/10 text-primary";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function NotificationsSummary({
  preferences,
}: NotificationsSummaryProps) {
  return (
    <section aria-label="Resumen de notificaciones" className="space-y-4">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const tone = card.tone(preferences);

          return (
            <li key={card.key}>
              <div className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </span>
                  <div
                    className={cn(
                      "rounded-xl p-2.5",
                      toneClass(tone),
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-heading text-2xl font-bold tracking-tight text-foreground">
                    {card.getValue(preferences)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {card.getHint(preferences)}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
