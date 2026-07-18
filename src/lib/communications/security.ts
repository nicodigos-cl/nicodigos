import crypto from "node:crypto";
import sanitizeHtml from "sanitize-html";

const allowedTags = ["p", "br", "strong", "em", "ul", "ol", "li", "a", "code", "blockquote"];

export function sanitizeEmailHtml(input: string): { html: string; hadRemoteImages: boolean } {
  const hadRemoteImages = /<img\b/i.test(input);
  return {
    hadRemoteImages,
    html: sanitizeHtml(input, {
      allowedTags,
      allowedAttributes: { a: ["href", "title"] },
      allowedSchemes: ["http", "https", "mailto"],
      allowProtocolRelative: false,
      disallowedTagsMode: "discard",
      enforceHtmlBoundary: true,
      transformTags: {
        a: sanitizeHtml.simpleTransform("a", { rel: "noreferrer noopener", target: "_blank" }),
      },
    }),
  };
}

export function plainTextFromHtml(input: string): string {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} })
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 50_000);
}

export function safeAdminHtmlFromText(input: string): string {
  const escaped = sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function maskEmail(address: string): string {
  const [local = "", domain = ""] = address.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

export function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  return message
    .replace(/re_[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/whsec_[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 500);
}

export function hashProviderId(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function externalIdSuffix(value?: string | null): string | null {
  return value ? `…${value.slice(-8)}` : null;
}
