import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { betterAuth } from "better-auth";
import { Miniflare } from "miniflare";

async function createTestDatabase() {
  const miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    compatibilityDate: "2026-05-22",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: { DB: "erprint-auth-test" },
  });
  const db = await miniflare.getD1Database("DB");
  const migrations = (await readdir(new URL("../drizzle/", import.meta.url)))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const migration of migrations) {
    const sql = await readFile(new URL(`../drizzle/${migration}`, import.meta.url), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const query = statement.trim();
      if (query) await db.prepare(query).run();
    }
  }

  return { db, miniflare };
}

test("creates an isolated email/password account and session", async () => {
  const { db, miniflare } = await createTestDatabase();
  const auth = betterAuth({
    appName: "ERPrint Test",
    database: db,
    secret: "test-only-secret-with-more-than-32-characters",
    baseURL: "http://localhost",
    basePath: "/api/auth",
    trustedOrigins: ["http://localhost"],
    emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 20 },
    advanced: {
      database: { generateId: "uuid" },
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
  });

  try {
    const signUp = await auth.handler(
      new Request("http://localhost/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost",
          "cf-connecting-ip": "127.0.0.1",
        },
        body: JSON.stringify({
          name: "Usuário de Teste",
          email: "usuario@erprint.test",
          password: "senha-segura-123",
        }),
      }),
    );

    assert.equal(signUp.status, 200);
    const payload = await signUp.json();
    assert.equal(payload.user.email, "usuario@erprint.test");
    assert.ok(payload.user.id);

    const account = await db
      .prepare('SELECT password FROM account WHERE "userId" = ?')
      .bind(payload.user.id)
      .first();
    assert.ok(account.password);
    assert.notEqual(account.password, "senha-segura-123");

    const setCookie = signUp.headers.get("set-cookie") ?? "";
    const sessionCookie = setCookie.match(/(?:__Secure-)?better-auth\.session_token=[^;]+/)?.[0];
    assert.ok(sessionCookie, "sign-up should issue a session cookie");

    const session = await auth.handler(
      new Request("http://localhost/api/auth/get-session", {
        headers: { cookie: sessionCookie, "cf-connecting-ip": "127.0.0.1" },
      }),
    );
    assert.equal(session.status, 200);
    const sessionPayload = await session.json();
    assert.equal(sessionPayload.user.id, payload.user.id);
  } finally {
    await miniflare.dispose();
  }
});
