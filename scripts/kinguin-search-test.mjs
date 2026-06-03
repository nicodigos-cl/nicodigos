import "dotenv/config";
import { fetchAllKinguinProductsByName } from "../lib/admin/products/kinguin-search.ts";

const query = process.argv[2] ?? "battlefield";
const result = await fetchAllKinguinProductsByName(query);
console.log({
  query,
  searchMode: result.searchMode,
  fromCache: result.fromCache,
  count: result.products.length,
  samples: result.products.slice(0, 3).map((p) => p.name),
});
