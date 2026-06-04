import { IconStar } from "@tabler/icons-react";

import { SectionShell } from "@/components/home/section-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { homeReviews } from "@/lib/store/home/reviews";

function StarRating({ rating }: { rating: number }) {
  return (
    <div
      className="flex gap-0.5"
      role="img"
      aria-label={`${rating} de 5 estrellas`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <IconStar
          key={i}
          className={
            i < rating
              ? "size-4 fill-amber-400 text-amber-400"
              : "size-4 text-muted-foreground/30"
          }
          aria-hidden
        />
      ))}
    </div>
  );
}

export function ReviewsSection() {
  return (
    <SectionShell
      id="opiniones"
      eyebrow="Comunidad"
      title="Lo que dicen nuestros clientes"
      description="Opiniones de compradores verificados en Chile."
      className="py-16 sm:py-20"
    >
      <ul className="grid gap-6 md:grid-cols-3">
        {homeReviews.map((review) => (
          <li key={review.id}>
            <Card className="h-full">
              <CardHeader className="gap-3">
                <StarRating rating={review.rating} />
                <CardTitle className="text-base font-bold">
                  {review.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  {review.author} · {review.platform}
                  {review.verified ? " · Compra verificada" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {review.body}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
