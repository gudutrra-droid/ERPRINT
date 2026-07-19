// Bindings do Worker disponíveis via `import { env } from "cloudflare:workers"`.
// Mantenha em sincronia com a config de deploy (vite.config.ts) e os secrets.
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    BETTER_AUTH_SECRET: string;
  }
}
