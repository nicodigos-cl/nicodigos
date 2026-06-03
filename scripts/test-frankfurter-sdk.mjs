import { createFrankfurterClient } from "frankfurter-js";

const client = createFrankfurterClient();
const rates = await client.latest({ base: "EUR", quotes: ["CLP"] });
console.log(rates);
