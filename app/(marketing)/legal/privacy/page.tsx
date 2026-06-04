import type { Metadata } from "next";
import Link from "next/link";
import { storeRoutes } from "@/lib/store/navigation";

export const metadata: Metadata = {
  title: "Política de Privacidad — Nicodigos",
  description: "Política de privacidad y protección de datos personales de Nicodigos en conformidad con la legislación chilena.",
  alternates: {
    canonical: "/legal/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="flex-1 relative overflow-hidden bg-background py-16 sm:py-24">
      {/* Background decorations */}
      <div className="absolute inset-0 admin-dashboard-grid opacity-15 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
        <div className="space-y-4 border-b border-border/40 pb-8">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Política de Privacidad
          </h1>
          <p className="text-xs text-muted-foreground">
            Última actualización: 4 de junio de 2026
          </p>
        </div>

        <div className="font-sans text-sm sm:text-base text-muted-foreground/90 space-y-8 leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              1. Compromiso de Privacidad y Normativa Aplicable
            </h2>
            <p>
              En **Nicodigos.cl** nos tomamos muy en serio la seguridad y privacidad de la información personal de nuestros clientes. El tratamiento de los datos personales se realiza en estricta conformidad con la **Ley N° 19.628 sobre Protección de la Vida Privada** de la República de Chile y demás normas complementarias.
            </p>
            <p>
              El responsable del tratamiento y resguardo de tus datos es **TREVORSTORECL SPA**, RUT **77.649.515-8**, con domicilio legal en **SAN MARTIN 553 OF 901, COMUNA CONCEPCION, CHILE**.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              2. Datos Recopilados y Finalidad
            </h2>
            <p>
              Para operar el Sitio, procesar los pedidos y cumplir con las obligaciones impositivas chilenas, recopilamos los siguientes datos de los usuarios:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>**Datos de Registro y Cuenta:** Nombre completo, dirección de correo electrónico y contraseña encriptada.</li>
              <li>**Datos de Facturación (Requeridos por el SII en Chile):** Nombre completo o razón social, RUT, giro comercial (en caso de factura), calle, número, comuna y región de domicilio.</li>
              <li>**Datos de Contacto:** Número telefónico (para alertas de seguridad y coordinación de despacho).</li>
            </ul>
            <p>
              La finalidad exclusiva de la recolección es la validación y emisión de las boletas o facturas correspondientes, la entrega electrónica automática de los códigos de activación adquiridos, la atención de consultas post-venta y la prevención de fraudes electrónicos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              3. Compartición de Datos con Terceros
            </h2>
            <p>
              Nicodigos no vende, alquila ni distribuye la información personal de sus usuarios a terceros con fines publicitarios. Sus datos únicamente se transfieren a entidades indispensables para el funcionamiento del servicio:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>**Pasarela de Pago (Flow.cl):** Se comparten los datos básicos del pedido y de contacto para el procesamiento seguro de la transacción.</li>
              <li>**Emisión Tributaria:** Datos requeridos para la emisión y registro de documentos fiscales electrónicos ante el Servicio de Impuestos Internos (SII) de Chile.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              4. Seguridad y Resguardo de Datos
            </h2>
            <p>
              Utilizamos altos estándares de seguridad en la industria, incluyendo cifrado SSL/TLS para toda la comunicación de datos, servidores de base de datos en entornos seguros y almacenamiento protegido. Dado que los pagos se delegan completamente a **Flow.cl**, nosotros **no almacenamos ni procesamos información financiera** como números de tarjetas bancarias ni contraseñas bancarias.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              5. Derechos de los Titulares (Derechos ARCO)
            </h2>
            <p>
              En conformidad con la legislación chilena, los usuarios tienen derecho en todo momento a ejercer sus facultades de:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li>**Acceso:** Conocer qué datos personales tenemos almacenados.</li>
              <li>**Rectificación:** Modificar datos erróneos, incompletos o desactualizados.</li>
              <li>**Cancelación:** Solicitar la eliminación de sus datos cuando no exista una obligación legal o contractual que nos exija retenerlos.</li>
              <li>**Oposición:** Oponerse al uso de sus datos para fines específicos.</li>
            </ul>
            <p>
              Para ejercer cualquiera de estos derechos, el usuario puede enviar una solicitud formal por escrito al correo electrónico **contacto@nicodigos.cl**, adjuntando antecedentes que validen su identidad.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              6. Modificaciones a la Política
            </h2>
            <p>
              Nicodigos se reserva el derecho de modificar la presente Política de Privacidad para adaptarla a novedades legislativas o jurisprudenciales dentro de Chile. Cualquier cambio sustancial será debidamente notificado en esta sección del Sitio.
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
            href="/legal/terms"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Ver Términos y Condiciones →
          </Link>
        </div>
      </div>
    </main>
  );
}
