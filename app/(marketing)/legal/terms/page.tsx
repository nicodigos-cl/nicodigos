import type { Metadata } from "next";
import Link from "next/link";
import { storeRoutes } from "@/lib/store/navigation";

export const metadata: Metadata = {
  title: "Términos y Condiciones — Nicodigos",
  description: "Términos y condiciones de uso del marketplace de keys y productos digitales Nicodigos en Chile.",
  alternates: {
    canonical: "/legal/terms",
  },
};

export default function TermsPage() {
  return (
    <main className="flex-1 relative overflow-hidden bg-background py-16 sm:py-24">
      {/* Background patterns */}
      <div className="absolute inset-0 admin-dashboard-grid opacity-15 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
        <div className="space-y-4 border-b border-border/40 pb-8">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Términos y Condiciones de Uso
          </h1>
          <p className="text-xs text-muted-foreground">
            Última actualización: 4 de junio de 2026
          </p>
        </div>

        <div className="font-sans text-sm sm:text-base text-muted-foreground/90 space-y-8 leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              1. Aspectos Generales y Empresa Operadora
            </h2>
            <p>
              El presente documento establece los términos y condiciones bajo los cuales se regula el acceso y uso del sitio web **Nicodigos.cl** (en adelante, el "Sitio"), un marketplace de distribución de licencias de software, códigos de juegos y tarjetas de regalo digitales (en adelante, los "Productos").
            </p>
            <p>
              La operación, facturación y soporte del Sitio están a cargo de la sociedad de responsabilidad limitada **TREVORSTORECL SPA**, RUT **77.649.515-8**, con domicilio legal en **SAN MARTIN 553 OF 901, COMUNA CONCEPCION, CHILE**. Para cualquier consulta o contacto legal, se dispone del correo electrónico **contacto@nicodigos.cl**.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              2. Capacidad y Registro de Usuarios
            </h2>
            <p>
              Los servicios del Sitio están disponibles para personas que tengan capacidad legal para contratar de acuerdo con la legislación chilena. Para adquirir Productos, el usuario debe registrarse ingresando datos reales, válidos e identificatorios. Cada usuario es responsable de mantener la confidencialidad de sus credenciales de acceso.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              3. Precios, Impuestos y Comisiones
            </h2>
            <p>
              Todos los precios informados en la plataforma se expresan en pesos chilenos (CLP) y corresponden al valor final a pagar por el consumidor. De acuerdo con las obligaciones tributarias vigentes en Chile:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Los precios finales mostrados en las tarjetas de producto e interfaces de compra incluyen el **Impuesto al Valor Agregado (IVA) del 19%**.</li>
              <li>El valor final a pagar contempla también las comisiones de procesamiento de transacciones correspondientes al procesador de pagos **Flow.cl** (3,19% + IVA = 3,7961% neto sobre la transacción).</li>
              <li>Al finalizar el checkout, se desglosará debidamente el neto, el IVA y la comisión del procesador de pagos para total transparencia del cliente.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              4. Medios de Pago y Transacciones
            </h2>
            <p>
              El Sitio procesa sus pagos mediante la pasarela segura **Flow.cl**, permitiendo transacciones con tarjetas de débito y crédito a través de Webpay, Redcompra, transferencias bancarias y otros sistemas autorizados locales en Chile. Nicodigos no almacena ni recopila números ni datos financieros directos de las tarjetas de los clientes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              5. Entrega Digital Automática e Instantánea
            </h2>
            <p>
              Por la naturaleza digital de los Productos distribuidos (claves de activación o CD Keys, saldo de billeteras de consola, suscripciones):
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>El despacho se realiza de forma **inmediata** y automática a través de medios electrónicos.</li>
              <li>Apenas se valide el pago por Flow.cl, las claves de activación se enviarán al correo electrónico registrado del cliente y quedarán disponibles para visualización y copia en el panel de usuario ("Mis Pedidos" o "Mis Keys") en el Sitio.</li>
              <li>El cliente debe asegurarse de revisar su carpeta de Spam o Correo No Deseado en caso de retraso en la recepción del email.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              6. Derecho de Retracto y Devoluciones
            </h2>
            <p>
              Conforme al artículo 3 bis letra b) de la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores en Chile, y debido a la naturaleza de los bienes comercializados (Productos digitales e intangibles de descarga o activación inmediata que quedan inutilizables para reventa una vez visualizados):
            </p>
            <p className="font-semibold text-foreground">
              No opera el derecho de retracto en las compras realizadas en este Sitio una vez que el código o key ha sido generado, entregado o visualizado por el cliente.
            </p>
            <p>
              La garantía legal opera únicamente en caso de fallas técnicas de origen en el código (por ejemplo: código inválido, ya canjeado con anterioridad a la venta o de región incorrecta por error del sistema). En tal escenario, el cliente tendrá derecho a solicitar el reemplazo del código funcional o el reembolso íntegro del dinero, previa auditoría con nuestro equipo de soporte técnico.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              7. Jurisdicción y Resolución de Conflictos
            </h2>
            <p>
              Estos Términos y Condiciones se rigen por las leyes de la República de Chile. Cualquier dificultad o conflicto que surja con relación a la validez, aplicación o interpretación de estas normas será sometido a la competencia de los Tribunales de Justicia ordinarios chilenos.
            </p>
          </section>

        </div>

        <div className="border-t border-border/40 pt-6 flex justify-between">
          <Link
            href={storeRoutes.home}
            className="text-sm font-semibold text-primary hover:underline"
          >
            ← Volver al inicio
          </Link>
          <Link
            href="/legal/privacy"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Ver Política de Privacidad →
          </Link>
        </div>
      </div>
    </main>
  );
}
