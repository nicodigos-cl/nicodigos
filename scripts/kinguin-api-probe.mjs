/**
 * Probe Kinguin /v1/products with varied clients and query serialization.
 * Run: node scripts/kinguin-api-probe.mjs
 *
 * Finding (sandbox): any ?name= with 3+ chars returns HTTP 500 from Kinguin.
 * Serialization (axios/fetch/qs) is not the cause. Use catalog + local filter.
 */
import "dotenv/config";
import axios from "axios";
import qs from "node:querystring";

const base = process.env.KINGUIN_API_BASE;
const key = process.env.KINGUIN_API_KEY;

if (!base || !key) {
  console.error("Missing KINGUIN_API_BASE or KINGUIN_API_KEY");
  process.exit(1);
}

const cases = [];

function record(label, status, extra = "") {
  cases.push({ label, status, extra });
  const mark = status === 200 ? "OK " : "ERR";
  console.log(`${mark} ${label}${extra ? ` — ${extra}` : ""}`);
}

async function axiosGet(path, config = {}) {
  const client = axios.create({
    baseURL: base,
    headers: {
      "X-Api-Key": key,
      ...config.headers,
    },
    validateStatus: () => true,
    ...config.clientOptions,
  });
  return client.get(path, config.request);
}

async function fetchGet(url, headers = {}) {
  const res = await fetch(url, {
    headers: { "X-Api-Key": key, ...headers },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 120);
  }
  return { status: res.status, body };
}

console.log(`\nBase: ${base}\n`);

// 1) Raw fetch — docs style (name only)
{
  const url = `${base}/v1/products?name=forza`;
  const { status, body } = await fetchGet(url);
  record(
    "fetch name=forza only",
    status,
    status === 200
      ? `count=${body.item_count}`
      : JSON.stringify(body).slice(0, 80),
  );
}

// 2) fetch with encoded spaces
{
  const q = new URLSearchParams({ name: "Elden Ring" });
  const url = `${base}/v1/products?${q}`;
  const { status, body } = await fetchGet(url);
  record(
    "fetch name=Elden Ring",
    status,
    status === 200
      ? `count=${body.item_count}`
      : JSON.stringify(body).slice(0, 80),
  );
}

// 3) axios default params object
{
  const r = await axiosGet("/v1/products", {
    request: { params: { name: "forza" } },
  });
  record(
    "axios params { name: forza }",
    r.status,
    r.status === 200 ? `count=${r.data.item_count}` : r.data?.detail,
  );
}

// 4) axios with page/limit as numbers
{
  const r = await axiosGet("/v1/products", {
    request: { params: { name: "forza", page: 1, limit: 25 } },
  });
  record(
    "axios name+page+limit numbers",
    r.status,
    r.status === 200 ? `count=${r.data.item_count}` : r.data?.detail,
  );
}

// 5) axios paramsSerializer — no array indexes
{
  const r = await axiosGet("/v1/products", {
    clientOptions: {
      paramsSerializer: (params) => qs.stringify(params),
    },
    request: { params: { name: "forza", page: 1, limit: 25 } },
  });
  record(
    "axios qs.stringify params",
    r.status,
    r.status === 200 ? `count=${r.data.item_count}` : r.data?.detail,
  );
}

// 6) axios — page/limit as strings
{
  const r = await axiosGet("/v1/products", {
    request: { params: { name: "forza", page: "1", limit: "25" } },
  });
  record(
    "axios page/limit strings",
    r.status,
    r.status === 200 ? `count=${r.data.item_count}` : r.data?.detail,
  );
}

// 7) no Content-Type on GET
{
  const r = await axiosGet("/v1/products", {
    headers: { "Content-Type": undefined },
    request: { params: { name: "forza" } },
  });
  record(
    "axios no Content-Type",
    r.status,
    r.status === 200 ? `count=${r.data.item_count}` : r.data?.detail,
  );
}

// 8) manual URL path
{
  const r = await axiosGet("/v1/products?name=forza&page=1&limit=25");
  record(
    "axios path query string",
    r.status,
    r.status === 200 ? `count=${r.data.item_count}` : r.data?.detail,
  );
}

// 9) baseline without name
{
  const r = await axiosGet("/v1/products", {
    request: { params: { limit: 25, page: 1 } },
  });
  record(
    "axios no name",
    r.status,
    r.status === 200 ? `count=${r.data.item_count}` : r.data?.detail,
  );
}

// 10) sortBy typo from docs (kingiunId)
for (const sortBy of ["kingiunId", "updatedAt", undefined]) {
  const params = { name: "forza", limit: 25, page: 1 };
  if (sortBy) {
    params.sortBy = sortBy;
    params.sortType = "asc";
  }
  const r = await axiosGet("/v1/products", { request: { params } });
  record(
    `axios sortBy=${sortBy ?? "none"}`,
    r.status,
    r.status === 200 ? `count=${r.data.item_count}` : r.data?.detail,
  );
}

// 11) platform filter instead of name
{
  const r = await axiosGet("/v1/products", {
    request: { params: { platform: "Steam", limit: 10, page: 1 } },
  });
  record(
    "axios platform=Steam",
    r.status,
    r.status === 200 ? `count=${r.data.item_count}` : r.data?.detail,
  );
}

// 12) tags=base
{
  const r = await axiosGet("/v1/products", {
    request: { params: { tags: "base", name: "forza", limit: 25 } },
  });
  record(
    "axios tags+name",
    r.status,
    r.status === 200 ? `count=${r.data.item_count}` : r.data?.detail,
  );
}

// 13) production gateway if sandbox
if (base.includes("sandbox")) {
  const prodBase = "https://gateway.kinguin.net/esa/api";
  const url = `${prodBase}/v1/products?name=forza`;
  const res = await fetch(url, { headers: { "X-Api-Key": key } });
  const text = await res.text();
  record("prod gateway name=forza (same key)", res.status, text.slice(0, 80));
}

console.log("\n--- summary ---");
const nameFails = cases.filter(
  (c) => c.label.includes("name") && c.status !== 200,
);
const nameOk = cases.filter(
  (c) => c.label.includes("name") && c.status === 200,
);
console.log(`Name search OK: ${nameOk.length}, failed: ${nameFails.length}`);
