"use client";

import Link from "next/link";
import { HiOutlineExclamationCircle } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type CatalogErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CatalogError({ reset }: CatalogErrorProps) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4 py-16">
      <Empty className="border border-border bg-card/60">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HiOutlineExclamationCircle className="size-5" />
          </EmptyMedia>
          <EmptyTitle>No pudimos cargar el catálogo</EmptyTitle>
          <EmptyDescription>
            Ocurrió un error al obtener los productos. Intenta de nuevo o vuelve
            al inicio.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset}>
            Reintentar
          </Button>
          <Button
            render={<Link href="/" />}
            nativeButton={false}
            variant="outline"
          >
            Ir al inicio
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
