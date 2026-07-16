import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the ERPrint dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="pt-BR">/i);
  assert.match(html, /<title>Painel \| ERPrint ERP<\/title>/i);
  assert.match(html, /Sua operação, da impressão à entrega/);
  assert.match(html, /Módulos planejados/);
  assert.match(html, /Marketplaces/);
  assert.match(html, /Shopee em primeiro lugar/);
});

test("does not ship starter preview markers", async () => {
  const response = await render();
  const html = await response.text();
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Starter Project/);
});
