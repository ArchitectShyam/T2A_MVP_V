// One-off check for the Navigate feature: verify tables exist + report row
// counts. Reads secrets from apps/web/.env.local; never prints them.
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
  return { status: r.status, body: await r.text() };
}

const tables = [
  "practices",
  "practice_steps",
  "ritual_details",
  "ritual_identity_links",
  "reflections",
  "nudges",
  "daily_logs",
  "daily_focus_activities",
];

for (const t of tables) {
  const r = await get(`${t}?select=id&limit=1`);
  console.log(`${t.padEnd(24)} HTTP ${r.status}  ${r.status >= 300 ? r.body.slice(0, 160) : ""}`);
}
