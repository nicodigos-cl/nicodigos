"use client";
import Link from "next/link";
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineMail,
  HiOutlineCreditCard,
  HiOutlineCheck,
} from "react-icons/hi";

import { Button } from "@/components/ui/button";
import type { CustomerProfileCompleteness } from "@/lib/customer-dashboard/types";

export function ProfileCompletenessCard({
  profile,
}: {
  profile: CustomerProfileCompleteness;
}) {
  const percentage =
    profile.level === "complete" ? 100 : profile.level === "partial" ? 70 : 35;

  const handleScrollToBilling = () => {
    const element = document.getElementById("billing-form");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      // Find the first input in billing form and focus it
      const input = element.querySelector("input, select") as HTMLElement | null;
      if (input) {
        setTimeout(() => input.focus(), 500);
      }
    }
  };

  const hasMissingBilling =
    profile.missing.some((item) =>
      ["RUT", "Razón social", "Giro", "Dirección"].includes(item),
    ) ||
    profile.recommended.some((item) =>
      ["RUT", "Dirección de facturación"].includes(item),
    );

  return (
    <div className="space-y-4">
      {/* Main Completeness Card */}
      <section
        className={`rounded-2xl border p-5 sm:p-6 transition-all ${
          profile.level === "complete"
            ? "border-emerald-500/20 bg-emerald-500/5 dark:border-emerald-500/10 dark:bg-emerald-950/5"
            : profile.level === "partial"
              ? "border-amber-500/20 bg-amber-500/5 dark:border-amber-500/10 dark:bg-amber-950/5"
              : "border-rose-500/20 bg-rose-500/5 dark:border-rose-500/10 dark:bg-rose-950/5"
        }`}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`rounded-xl p-3 shrink-0 ${
                profile.level === "complete"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : profile.level === "partial"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              {profile.level === "complete" ? (
                <HiOutlineCheckCircle className="size-6" />
              ) : (
                <HiOutlineExclamationCircle className="size-6" />
              )}
            </div>
            <div className="space-y-1.5 min-w-0">
              <h2 className="font-heading text-lg font-bold text-foreground">
                {profile.level === "complete"
                  ? "¡Perfil completo!"
                  : profile.level === "partial"
                    ? "Perfil parcialmente completo"
                    : "Completa tus datos de cliente"}
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {profile.level === "complete"
                  ? "Toda tu información personal y de facturación está al día. Esto nos ayuda a procesar tus pedidos con mayor rapidez."
                  : "Por favor, completa los campos requeridos y recomendados para que podamos emitir tus documentos y realizar tus entregas correctamente."}
              </p>

              {/* Progress bar */}
              <div className="flex items-center gap-3 pt-2">
                <div className="h-2 w-48 overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      profile.level === "complete"
                        ? "bg-emerald-500"
                        : profile.level === "partial"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span
                  className={`font-mono text-sm font-semibold ${
                    profile.level === "complete"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : profile.level === "partial"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {percentage}% completado
                </span>
              </div>
            </div>
          </div>

          {/* Quick CTAs */}
          <div className="flex flex-col gap-2 shrink-0 sm:flex-row md:flex-col">
            {!profile.emailVerified && (
              <Button
                size="sm"
                variant="outline"
                render={<Link href="/dashboard/security" />}
                nativeButton={false}
                className="gap-2 font-medium"
              >
                <HiOutlineMail className="size-4" />
                <span>Verificar email</span>
              </Button>
            )}
            {profile.level !== "complete" && hasMissingBilling && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleScrollToBilling}
                className="gap-2 font-medium"
              >
                <HiOutlineCreditCard className="size-4" />
                <span>Completar facturación</span>
              </Button>
            )}
          </div>
        </div>

        {/* Detailed checklist */}
        {profile.level !== "complete" && (
          <div className="mt-6 border-t border-border/60 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Campos por completar:
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.missing.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                >
                  <span className="size-1.5 rounded-full bg-rose-500" />
                  {item} (Obligatorio)
                </span>
              ))}
              {profile.recommended.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                >
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  {item} (Recomendado)
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Verification Warning Alert banner (if email not verified) */}
      {!profile.emailVerified && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/10 dark:bg-amber-950/5">
          <div className="flex items-start gap-3">
            <HiOutlineMail className="size-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Email sin verificar
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                Tu dirección de correo <span className="font-semibold text-foreground">{profile.email}</span> no está verificada.
                Verifícala en la sección de seguridad para habilitar todas las notificaciones y resguardar tu cuenta.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/dashboard/security" />}
            nativeButton={false}
            className="shrink-0 border-amber-300/40 hover:bg-amber-500/10 text-amber-700 dark:border-amber-800/40 dark:text-amber-400 font-medium"
          >
            <span>Ir a Seguridad</span>
            <HiOutlineCheck className="size-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
