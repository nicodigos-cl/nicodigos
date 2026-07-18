export function maskSecret(value: string, visible = 4): string {
  if (!value) return "";
  if (value.length <= visible) return "•".repeat(Math.max(4, value.length));
  return `${"•".repeat(Math.max(4, value.length - visible))}${value.slice(-visible)}`;
}
