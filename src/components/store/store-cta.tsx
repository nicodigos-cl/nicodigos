import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function StoreCTA() {
  return (
    <section className="bg-primary py-20 px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl">
          Explora nuestro catálogo y encuentra lo que necesitas.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-pretty text-primary-foreground">
          Encuentra los mejores productos digitales y servicios SMM al mejor precio.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button
            render={<Link href="/categorias" />}
            size="lg"
            variant="outline"
            className="px-8 py-4 text-base font-semibold rounded-md shadow-sm bg-transparent text-primary-foreground"
          >
            Explorar catálogo
          </Button>
          <Button
            render={<Link href="/?filtro=ofertas" />}
            size="lg"
            variant="outline"
            className="px-8 py-4 text-base font-semibold rounded-md shadow-sm hover:bg-transparent hover:text-primary-foreground"
          >
            Ver ofertas
          </Button>
        </div>
      </div>
    </section>
  )
}
