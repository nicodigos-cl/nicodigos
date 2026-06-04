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
    title: "Key al instante",
    body: "Compré un juego de Steam y la key llegó en minutos. Todo claro en el panel de pedidos.",
    platform: "Steam",
    verified: true,
  },
  {
    id: "2",
    author: "Camila V.",
    rating: 5,
    title: "Gift card sin problemas",
    body: "Gift card de Xbox activada sin drama. Precio competitivo frente a otras tiendas.",
    platform: "Xbox",
    verified: true,
  },
  {
    id: "3",
    author: "Jorge P.",
    rating: 4,
    title: "Buen soporte",
    body: "Tuve una duda con la región del producto y me respondieron rápido por correo.",
    platform: "PlayStation",
    verified: true,
  },
];
