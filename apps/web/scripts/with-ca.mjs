// Dev launcher: transparently trust the local corporate CA bundle (if present)
// before starting Next, so server-side Supabase calls work behind TLS
// inspection. On machines without the bundle this is a no-op.
//
// NODE_EXTRA_CA_CERTS must be set before Node starts, so we set it here and
// spawn `next` as a child that inherits it.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");
const caPath = path.join(repoRoot, "certs", "corporate-ca-bundle.pem");

const env = { ...process.env };
if (existsSync(caPath) && !env.NODE_EXTRA_CA_CERTS) {
  env.NODE_EXTRA_CA_CERTS = caPath;
  console.log(`[with-ca] Trusting corporate CA bundle: ${caPath}`);
}

const args = process.argv.slice(2);
// Pass a single command string (not an args array) with shell:true to avoid
// Node's DEP0190 warning. The args come from our own package.json, not user
// input, so there is no injection surface.
const command = ["next", ...args].join(" ");
const child = spawn(command, { stdio: "inherit", shell: true, env });
child.on("exit", (code) => process.exit(code ?? 0));
