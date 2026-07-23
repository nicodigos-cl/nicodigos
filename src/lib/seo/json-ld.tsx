import {
  SITE_CURRENCY,
  SITE_DESCRIPTION,
  SITE_LANGUAGE,
  SITE_LEGAL_NAME,
  SITE_NAME,
  SITE_SUPPORT_EMAIL,
  absoluteUrl,
  getSiteUrl,
} from "@/lib/seo/site";
import type { StoreProductDetailDto } from "@/types/products";

export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function buildOrganizationJsonLd(): Record<string, unknown> {
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": `${url}/#organization`,
    name: SITE_NAME,
    legalName: SITE_LEGAL_NAME,
    url,
    logo: absoluteUrl("/logo.png"),
    image: absoluteUrl("/logo.png"),
    description: SITE_DESCRIPTION,
    email: SITE_SUPPORT_EMAIL,
    areaServed: {
      "@type": "Country",
      name: "Chile",
    },
    availableLanguage: SITE_LANGUAGE,
    currenciesAccepted: SITE_CURRENCY,
    paymentAccepted: "Flow, Transferencia",
    priceRange: "$$",
  };
}

export function buildWebSiteJsonLd(): Record<string, unknown> {
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}/#website`,
    name: SITE_NAME,
    url,
    description: SITE_DESCRIPTION,
    inLanguage: SITE_LANGUAGE,
    publisher: { "@id": `${url}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/catalog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildProductJsonLd(
  product: StoreProductDetailDto,
): Record<string, unknown> {
  const url = absoluteUrl(product.href);
  const images = product.images
    .map((image) => image.src)
    .filter((urlValue): urlValue is string => Boolean(urlValue));

  const categoryNames = product.categories.map((category) => category.name);
  const brandName =
    product.publishers[0] ?? product.developers[0] ?? SITE_NAME;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.description?.replace(/<[^>]+>/g, " ").slice(0, 5000) ||
      `${product.name} en ${SITE_NAME}. Producto digital en CLP.`,
    sku: product.slug,
    url,
    image: images.length > 0 ? images : [absoluteUrl("/logo.png")],
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    category: categoryNames[0],
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: product.currency || SITE_CURRENCY,
      price: product.price,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
        url: getSiteUrl(),
      },
    },
  };
}
