import { type ComponentPropsWithoutRef, type ReactNode } from "react"
import { ArrowRightIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string
  className: string
  background: ReactNode
  Icon: React.ElementType
  description: string
  href: string
  cta: string
  /** Photo cards with dark overlays use light text. */
  tone?: "default" | "image"
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  tone = "default",
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
      // light styles
      "bg-background [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
      // dark styles
      "dark:bg-background transform-gpu dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:[border:1px_solid_rgba(255,255,255,.1)]",
      className
    )}
    {...props}
  >
    <div className="absolute inset-0">{background}</div>
    {tone === "image" ? (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-2/5 bg-gradient-to-t from-black/70 via-black/35 to-transparent"
      />
    ) : null}
    <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5">
      <div
        className={cn(
          "pointer-events-none z-10 flex transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-10",
          tone === "image" && "mt-auto"
        )}
      >
        <Icon
          className={cn(
            "h-10 w-10 origin-left transform-gpu transition-all duration-300 ease-in-out group-hover:scale-75 sm:h-12 sm:w-12",
            tone === "image"
              ? "text-white/90"
              : "text-neutral-700 dark:text-neutral-300"
          )}
        />
        <h3
          className={cn(
            "font-heading text-xl font-semibold tracking-tight",
            tone === "image"
              ? "text-white"
              : "text-neutral-700 dark:text-neutral-300"
          )}
        >
          {name}
        </h3>
        <p
          className={cn(
            "max-w-lg text-sm",
            tone === "image" ? "text-white/75" : "text-neutral-400"
          )}
        >
          {description}
        </p>
      </div>

      <div
        className={cn(
          "pointer-events-none relative z-10 flex w-full translate-y-0 transform-gpu flex-row items-center transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:hidden"
        )}
      >
        <Button
          variant="link"
          size="sm"
          className={cn(
            "pointer-events-auto p-0",
            tone === "image" && "text-white hover:text-white/90"
          )}
          render={<a href={href} />}
          nativeButton={false}
        >
          {cta}
          <ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>
    </div>

    <div
      className={cn(
        "pointer-events-none absolute bottom-0 z-10 hidden w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex sm:p-5"
      )}
    >
      <Button
        variant="link"
        size="sm"
        className={cn(
          "pointer-events-auto p-0",
          tone === "image" && "text-white hover:text-white/90"
        )}
        render={<a href={href} />}
        nativeButton={false}
      >
        {cta}
        <ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" />
      </Button>
    </div>

    <div className="pointer-events-none absolute inset-0 z-[1] transform-gpu transition-all duration-300 group-hover:bg-black/10" />
  </div>
)

export { BentoCard, BentoGrid }
