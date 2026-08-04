// One-off check: confirm Discover tables exist and report row counts.
// Reads secrets from apps/web/.env.local; never prints the keys.
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
if (!url || !service) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = { apikey: service, Authorization: `Bearer ${service}`, Prefer: "count=exact" };

const tables = [
  "values",
  "strengths",
  "interests",
  "user_values",
  "user_strengths",
  "user_interests",
  "beliefs",
  "user_roles",
  "aspirations",
];

for (const t of tables) {
  try {
    const r = await fetch(`${url}/rest/v1/${t}?select=id`, {
      method: "GET",
      headers: { ...headers, Range: "0-0" },
    });
    const range = r.headers.get("content-range");
    const total = range ? range.split("/")[1] : "?";
    if (!r.ok) {
      const body = (await r.text()).slice(0, 160);
      console.log(`${t.padEnd(16)} HTTP ${r.status}: ${body}`);
    } else {
      console.log(`${t.padEnd(16)} OK  rows=${total}`);
    }
  } catch (e) {
    console.log(`${t.padEnd(16)} ERROR ${e.message}`);
  }
}
