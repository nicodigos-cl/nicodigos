export function SignInHero() {
  return (
    <aside
      aria-hidden
      className="relative hidden w-0 flex-1 overflow-hidden bg-primary lg:block"
    >
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 100% 0%, color-mix(in oklch, var(--primary-foreground) 18%, transparent) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 0% 100%, color-mix(in oklch, var(--primary-foreground) 12%, transparent) 0%, transparent 50%),
            linear-gradient(145deg, var(--primary) 0%, color-mix(in oklch, var(--primary) 75%, black) 100%)
          `,
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `
            linear-gradient(color-mix(in oklch, var(--primary-foreground) 40%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in oklch, var(--primary-foreground) 40%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="absolute -right-24 top-1/4 size-80 rounded-full border border-primary-foreground/15" />
      <div className="absolute -left-16 bottom-1/3 size-56 rounded-full bg-primary-foreground/10 blur-2xl" />
      <div className="absolute right-1/4 top-12 size-3 rounded-full bg-primary-foreground/50" />
      <div className="absolute left-1/3 bottom-40 size-2 rounded-full bg-primary-foreground/35" />

      <p className="pointer-events-none absolute -right-6 bottom-8 select-none font-heading text-[clamp(6rem,14vw,11rem)] font-bold leading-none tracking-tighter text-primary-foreground/[0.08]">
        nicodigos
      </p>

      <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-2 rounded-full bg-primary-foreground" />
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-primary-foreground/80">
            Keys digitales
          </p>
        </div>

        <div className="max-w-[360px] space-y-8 my-auto">
          <blockquote className="space-y-5">
            <p className="font-heading text-4xl font-bold leading-[1.05] tracking-tight text-primary-foreground xl:text-5xl">
              Compra la key,
              <br />
              <span className="text-primary-foreground/55">actívala</span>
              <br />
              en minutos.
            </p>
            <p className="border-l-2 border-primary-foreground/30 pl-4 text-sm leading-relaxed text-primary-foreground/75">
              Keys, DLC y software con entrega digital inmediata. Sin esperas,
              sin envíos — solo tu código, listo para canjear.
            </p>
          </blockquote>

          {/* Mock Key Delivery Widget */}
          <div className="group relative w-full rounded-2xl border border-primary-foreground/15 bg-primary-foreground/[0.04] p-5 backdrop-blur-md shadow-2xl transition-all duration-300 hover:bg-primary-foreground/[0.08] hover:border-primary-foreground/25 hover:-translate-y-1 hover:shadow-primary-foreground/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">✓</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/90">Entrega completada</span>
              </div>
              <span className="text-[9px] font-mono text-primary-foreground/40">#ND-89412</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-primary-foreground/60">Producto</span>
                <span className="font-medium text-primary-foreground">Cyberpunk 2077 - Steam Key</span>
              </div>
              
              <div className="relative flex items-center justify-between rounded-xl bg-black/20 p-3 font-mono text-xs select-all border border-primary-foreground/10">
                <span className="text-emerald-300 font-semibold tracking-wider">CP77-KEY-8X92-ND21</span>
                <span className="text-[9px] text-emerald-300/90 bg-emerald-500/10 px-1.5 py-0.5 rounded font-sans font-medium uppercase tracking-wider">Activo</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium text-primary-foreground/70">
          <span className="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5 backdrop-blur-sm">
            Entrega instantánea
          </span>
          <span className="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5 backdrop-blur-sm">
            Keys &amp; DLC
          </span>
          <span className="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5 backdrop-blur-sm">
            Activación segura
          </span>
        </div>
      </div>
    </aside>
  );
}
