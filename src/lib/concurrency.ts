/** Split an array into fixed-size chunks (last chunk may be smaller). */
export function chunkArray<T>(items: readonly T[], size: number): T[][] {
  const chunkSize = Math.max(1, Math.floor(size));
  if (items.length === 0) return [];

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}
