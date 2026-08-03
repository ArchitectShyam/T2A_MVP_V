// One-off check: how many users/profiles exist in the Supabase project.
// Reads secrets from apps/web/.env.local; never prints the keys themselves.
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

const headers = { apikey: service, Authorization: `Bearer ${service}` };

// Diagnostics: proxy env + a raw connectivity probe with detailed error cause.
console.log("proxy env:", {
  HTTPS_PROXY: process.env.HTTPS_PROXY ?? process.env.https_proxy ?? null,
  HTTP_PROXY: process.env.HTTP_PROXY ?? process.env.http_proxy ?? null,
  NO_PROXY: process.env.NO_PROXY ?? process.env.no_proxy ?? null,
});
try {
  const probe = await fetch(`${url}/auth/v1/health`);
  console.log(`probe /auth/v1/health -> HTTP ${probe.status}`);
} catch (e) {
  console.log(`probe failed -> ${e.message}; cause:`, e.cause?.code ?? e.cause?.message ?? e.cause);
}

// 1) Auth users (via admin API)
try {
  const r = await fetch(`${url}/auth/v1/admin/users?per_page=100`, { headers });
  if (!r.ok) {
    console.log(`auth.users -> HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  } else {
    const body = await r.json();
    const users = body.users ?? body;
    console.log(`auth.users -> ${users.length} user(s)`);
    for (const u of users) {
      console.log(`  - ${u.email}  (id ${u.id}, confirmed=${!!u.email_confirmed_at}, created ${u.created_at})`);
    }
  }
} catch (e) {
  console.log(`auth.users -> error: ${e.message}`);
}

// 2) profiles table (via PostgREST; service role bypasses RLS)
try {
  const r = await fetch(`${url}/rest/v1/profiles?select=id,email,full_name,phone,plan,trial_ends_at,created_at`, { headers });
  if (!r.ok) {
    console.log(`public.profiles -> HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  } else {
    const rows = await r.json();
    console.log(`public.profiles -> ${rows.length} row(s)`);
    for (const p of rows) {
      console.log(`  - ${p.email}  name=${p.full_name ?? "-"}  phone=${p.phone ?? "-"}  plan=${p.plan}`);
    }
  }
} catch (e) {
  console.log(`public.profiles -> error: ${e.message}`);
}
