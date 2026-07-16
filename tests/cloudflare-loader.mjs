const cloudflareWorkersModule =
  "data:text/javascript," + encodeURIComponent("export const env = globalThis.__cloudflareTestEnv ?? {};");

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") {
    return { url: cloudflareWorkersModule, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
