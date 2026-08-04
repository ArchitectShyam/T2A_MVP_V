// One-off check for the Align feature: verify tables + the summits/domains
// embed, and report rows. Reads secrets from apps/web/.env.local; never prints them.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, "../../../apps/web/.env.local");

const env = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, "$1").trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: service, Authorization: `Bearer ${service}` };

async function get(pathAndQuery) {
  const r = await fetch(`${url}/rest/v1/${pathAndQuery}`, { headers });
  const body = await r.text();
  return { status: r.status, body };
}

for (const t of ["domains", "summits", "journeys", "actions", "steps", "monthly_summit_slots", "domain_alignment_scores"]) {
  const r = await get(`${t}?select=id&limit=1`);
  console.log(`${t.padEnd(24)} HTTP ${r.status}  ${r.status >= 300 ? r.body.slice(0, 160) : ""}`);
}

console.log("\n-- domains (code/name/dimension) --");
console.log((await get("domains?select=code,name,dimension&order=sort_order")).body);

console.log("\n-- summits with embedded domain code --");
console.log((await get("summits?select=id,title,domain_id,domains(code)&limit=10")).body);
