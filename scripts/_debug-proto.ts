import "dotenv/config";
import { eld } from "eld/large";
import prisma from "@/lib/prisma";
import { needsProductTranslation } from "@/lib/products/translate-fields";

const p = await prisma.product.findFirst({
  where: { name: { startsWith: "Prototype" } },
  select: { id: true, name: true, description: true },
});
const desc = p?.description ?? "";
const r = eld.detect(desc);
console.log(
  JSON.stringify(
    {
      id: p?.id,
      name: p?.name,
      needName: needsProductTranslation(p?.name),
      needDesc: needsProductTranslation(desc),
      lang: r.language,
      rel: r.isReliable(),
      hasAccent: /[áéíóúüñÁÉÍÓÚÜÑ¿¡]/.test(desc),
      descHead: desc.slice(0, 100),
    },
    null,
    2,
  ),
);
await prisma.$disconnect();
