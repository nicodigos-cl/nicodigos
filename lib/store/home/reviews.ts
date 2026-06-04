/** Typed mock reviews until a Review model exists in Prisma. */
export type HomeReview = {
  id: string;
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  platform: string;
  verified: boolean;
};

export const homeReviews: HomeReview[] = [
  {
    id: "1",
    author: "Matías R.",
    rating: 5,
    title: "Key al tiro",
    body: "Compré una key de Steam y llegó en minutos. Todo clarito en mis pedidos.",
    platform: "Steam",
    verified: true,
  },
  {
    id: "2",
    author: "Camila V.",
    rating: 5,
    title: "Gift card sin drama",
    body: "Gift card de Xbox activada sin problemas. Precio más conveniente que en otras tiendas.",
    platform: "Xbox",
    verified: true,
  },
  {
    id: "3",
    author: "Jorge P.",
    rating: 4,
    title: "Buen soporte",
    body: "Tuve una duda con la región de la key y me respondieron rápido por correo. Se pasaron.",
    platform: "PlayStation",
    verified: true,
  },
];
