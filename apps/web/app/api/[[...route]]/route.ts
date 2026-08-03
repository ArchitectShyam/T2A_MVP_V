import { handle } from "hono/vercel";
import { getApp } from "@/server/composition";

// The data layer uses postgres-js, so this route must run on the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = (req: Request) => handle(getApp())(req);

export {
  handler as DELETE,
  handler as GET,
  handler as PATCH,
  handler as POST,
  handler as PUT,
};
