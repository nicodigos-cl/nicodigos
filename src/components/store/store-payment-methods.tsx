import Image from "next/image";

import { paymentMethods } from "@/payment-methods";
import { cn } from "@/lib/utils";

type StorePaymentMethodsProps = {
  className?: string;
  label?: string;
};

export function StorePaymentMethods({
  className,
  label = "Pago seguro vía Flow",
}: StorePaymentMethodsProps) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <p className="text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
        {label}
      </p>
      <ul
        aria-label="Métodos de pago aceptados"
        className="flex flex-wrap items-center gap-2"
      >
        {paymentMethods.map((method) => (
          <li key={method.name}>
            <span
              title={method.name}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border/60 bg-background px-2.5 shadow-sm"
            >
              <Image
                src={method.src}
                alt={method.name}
                width={72}
                height={28}
                unoptimized
                className="h-5 w-auto max-w-[4.5rem] object-contain"
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
