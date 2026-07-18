import {
  HiOutlineQuestionMarkCircle,
  HiOutlineKey,
  HiOutlineCreditCard,
  HiOutlineShare,
} from "react-icons/hi";

export function SupportFaq() {
  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <HiOutlineQuestionMarkCircle className="size-5" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Preguntas frecuentes
          </h2>
          <p className="text-xs text-muted-foreground">
            Encuentra respuestas rápidas a las consultas más comunes.
          </p>
        </div>
      </div>

      <div className="grid gap-4 pt-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* FAQ 1 */}
        <div className="group rounded-xl border border-border bg-muted/20 p-4 transition-all duration-300 hover:border-primary/20 hover:bg-muted/40 hover:-translate-y-0.5">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <HiOutlineKey className="size-4 shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">
              ¿Dónde está mi key o cuenta?
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Dirígete a la pestaña de{" "}
            <span className="font-medium text-foreground">Mis entregas</span>. Por motivos
            de seguridad, las contraseñas y claves se mantienen ocultas y encriptadas hasta
            que elijas visualizarlas de forma segura.
          </p>
        </div>

        {/* FAQ 2 */}
        <div className="group rounded-xl border border-border bg-muted/20 p-4 transition-all duration-300 hover:border-primary/20 hover:bg-muted/40 hover:-translate-y-0.5">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <HiOutlineCreditCard className="size-4 shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">
              ¿Mi pago fue aprobado?
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Puedes verificar todos tus pagos desde la sección de{" "}
            <span className="font-medium text-foreground">Transacciones</span>. Si
            ocurrió algún inconveniente durante el cobro, verás una notificación
            y un botón de reintento directo en tu panel.
          </p>
        </div>

        {/* FAQ 3 */}
        <div className="group rounded-xl border border-border bg-muted/20 p-4 transition-all duration-300 hover:border-primary/20 hover:bg-muted/40 hover:-translate-y-0.5 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <HiOutlineShare className="size-4 shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">
              ¿Cómo activo un servicio SMM?
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Para iniciar servicios en redes sociales (SMM), ingresa al detalle de la
            entrega de tu pedido e introduce la URL de destino correspondiente. El
            procesamiento iniciará automáticamente a partir de ese momento.
          </p>
        </div>
      </div>
    </section>
  );
}
