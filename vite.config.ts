import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

// Banco D1 de produção na conta Cloudflare própria (erprint-db).
// Em dev local o Miniflare usa um banco SQLite local; o id só importa no deploy.
const PRODUCTION_D1_DATABASE_ID = "a76bf110-5ed3-4dfc-9cc3-864b9605c370";
const PRODUCTION_D1_DATABASE_NAME = "erprint-db";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  routes: [{ pattern: "erprint.dutrra.com", custom_domain: true }],
  // Cron Trigger: sincroniza vendas e ADS da Shopee a cada 1 minuto.
  triggers: { crons: ["* * * * *"] },
  images: { binding: "IMAGES" },
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: PRODUCTION_D1_DATABASE_NAME,
          database_id: PRODUCTION_D1_DATABASE_ID,
          migrations_dir: "drizzle",
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
