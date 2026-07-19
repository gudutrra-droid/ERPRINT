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

test("stores company fiscal and operational settings precisely", async () => {
  const { db, miniflare } = await createTestDatabase();

  try {
    await db
      .prepare(
        `INSERT INTO companies (
          id, name, segment, owner_email, tax_regime, tax_rate_bps,
          electricity_rate_cents, monthly_fixed_costs_cents,
          default_profit_margin_bps, currency, timezone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        "company-test",
        "ERPrint Teste",
        "3d-printing",
        "owner@erprint.test",
        "simples_nacional",
        600,
        95,
        125050,
        3000,
        "BRL",
        "America/Sao_Paulo",
      )
      .run();

    const company = await db
      .prepare(
        `SELECT tax_rate_bps, electricity_rate_cents,
          monthly_fixed_costs_cents, default_profit_margin_bps
        FROM companies WHERE id = ?`,
      )
      .bind("company-test")
      .first();

    assert.equal(company.tax_rate_bps, 600);
    assert.equal(company.electricity_rate_cents, 95);
    assert.equal(company.monthly_fixed_costs_cents, 125050);
    assert.equal(company.default_profit_margin_bps, 3000);
  } finally {
    await miniflare.dispose();
  }
});

test("isolates printers by company and stores power in watts", async () => {
  const { db, miniflare } = await createTestDatabase();

  try {
    await db.batch([
      db
        .prepare("INSERT INTO companies (id, name, segment, owner_email) VALUES (?, ?, ?, ?)")
        .bind("company-a", "Empresa A", "3d-printing", "a@erprint.test"),
      db
        .prepare("INSERT INTO companies (id, name, segment, owner_email) VALUES (?, ?, ?, ?)")
        .bind("company-b", "Empresa B", "3d-printing", "b@erprint.test"),
      db
        .prepare(
          "INSERT INTO printers (id, company_id, name, brand, model, power_watts, purchase_price_cents, useful_life_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("printer-a", "company-a", "Impressora 01", "Creality", "Ender-3", 350, 250000, 10000),
      db
        .prepare(
          "INSERT INTO printers (id, company_id, name, brand, model, power_watts, purchase_price_cents, useful_life_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("printer-b", "company-b", "Impressora 01", "Bambu Lab", "A1", 1300, 420000, 12000),
    ]);

    const companyAPrinters = await db
      .prepare(
        "SELECT name, brand, power_watts, purchase_price_cents, useful_life_hours, active FROM printers WHERE company_id = ?",
      )
      .bind("company-a")
      .all();

    assert.equal(companyAPrinters.results.length, 1);
    assert.equal(companyAPrinters.results[0].brand, "Creality");
    assert.equal(companyAPrinters.results[0].power_watts, 350);
    assert.equal(companyAPrinters.results[0].purchase_price_cents, 250000);
    assert.equal(companyAPrinters.results[0].useful_life_hours, 10000);
    assert.equal(companyAPrinters.results[0].purchase_price_cents / companyAPrinters.results[0].useful_life_hours, 25);
    assert.equal(companyAPrinters.results[0].active, 1);
  } finally {
    await miniflare.dispose();
  }
});

test("isolates filaments and derives the exact price per gram", async () => {
  const { db, miniflare } = await createTestDatabase();

  try {
    await db.batch([
      db
        .prepare("INSERT INTO companies (id, name, segment, owner_email) VALUES (?, ?, ?, ?)")
        .bind("filament-company-a", "Empresa A", "3d-printing", "filament-a@erprint.test"),
      db
        .prepare("INSERT INTO companies (id, name, segment, owner_email) VALUES (?, ?, ?, ?)")
        .bind("filament-company-b", "Empresa B", "3d-printing", "filament-b@erprint.test"),
      db
        .prepare(
          "INSERT INTO filaments (id, company_id, name, material, brand, price_per_kg_cents) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind("filament-a", "filament-company-a", "PLA Premium", "PLA", "Marca A", 8990),
      db
        .prepare(
          "INSERT INTO filaments (id, company_id, name, material, brand, price_per_kg_cents) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind("filament-b", "filament-company-b", "PLA Premium", "PLA", "Marca B", 11000),
    ]);

    const companyAFilaments = await db
      .prepare("SELECT name, brand, price_per_kg_cents, active FROM filaments WHERE company_id = ?")
      .bind("filament-company-a")
      .all();

    assert.equal(companyAFilaments.results.length, 1);
    assert.equal(companyAFilaments.results[0].brand, "Marca A");
    assert.equal(companyAFilaments.results[0].price_per_kg_cents, 8990);
    assert.equal(
      Number((companyAFilaments.results[0].price_per_kg_cents / 100 / 1000).toFixed(4)),
      0.0899,
    );
    assert.equal(companyAFilaments.results[0].active, 1);
  } finally {
    await miniflare.dispose();
  }
});

test("isolates supplies and preserves four-decimal unit prices", async () => {
  const { db, miniflare } = await createTestDatabase();

  try {
    await db.batch([
      db
        .prepare("INSERT INTO companies (id, name, segment, owner_email) VALUES (?, ?, ?, ?)")
        .bind("supply-company-a", "Empresa A", "3d-printing", "supply-a@erprint.test"),
      db
        .prepare("INSERT INTO companies (id, name, segment, owner_email) VALUES (?, ?, ?, ?)")
        .bind("supply-company-b", "Empresa B", "3d-printing", "supply-b@erprint.test"),
      db
        .prepare(
          "INSERT INTO supplies (id, company_id, name, category, unit_price_ten_thousandths) VALUES (?, ?, ?, ?, ?)",
        )
        .bind("supply-a", "supply-company-a", "Etiqueta", "packaging", 350),
      db
        .prepare(
          "INSERT INTO supplies (id, company_id, name, category, unit_price_ten_thousandths) VALUES (?, ?, ?, ?, ?)",
        )
        .bind("supply-b", "supply-company-b", "Etiqueta", "packaging", 500),
    ]);

    const companyASupplies = await db
      .prepare(
        "SELECT name, category, unit_price_ten_thousandths, active FROM supplies WHERE company_id = ?",
      )
      .bind("supply-company-a")
      .all();

    assert.equal(companyASupplies.results.length, 1);
    assert.equal(companyASupplies.results[0].name, "Etiqueta");
    assert.equal(companyASupplies.results[0].unit_price_ten_thousandths, 350);
    assert.equal(
      Number((companyASupplies.results[0].unit_price_ten_thousandths / 10_000 * 7).toFixed(4)),
      0.245,
    );
    assert.equal(companyASupplies.results[0].active, 1);
  } finally {
    await miniflare.dispose();
  }
});

test("isolates sales channels and applies the matching fee range", async () => {
  const { db, miniflare } = await createTestDatabase();

  try {
    await db.batch([
      db
        .prepare("INSERT INTO companies (id, name, segment, owner_email) VALUES (?, ?, ?, ?)")
        .bind("channel-company-a", "Empresa A", "3d-printing", "channel-a@erprint.test"),
      db
        .prepare("INSERT INTO companies (id, name, segment, owner_email) VALUES (?, ?, ?, ?)")
        .bind("channel-company-b", "Empresa B", "3d-printing", "channel-b@erprint.test"),
      db
        .prepare(
          "INSERT INTO sales_channels (id, company_id, name, percentage_fee_bps, fixed_fee_cents, shipping_fee_bps, shipping_fee_cents) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("channel-a", "channel-company-a", "Shopee", 1800, 438, 0, 0),
      db
        .prepare(
          "INSERT INTO sales_channels (id, company_id, name, percentage_fee_bps, fixed_fee_cents, shipping_fee_bps, shipping_fee_cents) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("channel-b", "channel-company-b", "Shopee", 2000, 500, 0, 0),
      db
        .prepare(
          "INSERT INTO sales_channel_fee_ranges (id, sales_channel_id, min_sale_cents, max_sale_cents, percentage_fee_bps, fixed_fee_cents, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("range-a-1", "channel-a", 0, 7999, 1800, 438, 0),
      db
        .prepare(
          "INSERT INTO sales_channel_fee_ranges (id, sales_channel_id, min_sale_cents, max_sale_cents, percentage_fee_bps, fixed_fee_cents, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("range-a-2", "channel-a", 8000, 9999, 1400, 1600, 1),
    ]);

    const companyAChannels = await db
      .prepare(
        "SELECT id, percentage_fee_bps, fixed_fee_cents, active FROM sales_channels WHERE company_id = ?",
      )
      .bind("channel-company-a")
      .all();

    assert.equal(companyAChannels.results.length, 1);
    assert.equal(companyAChannels.results[0].percentage_fee_bps, 1800);
    assert.equal(companyAChannels.results[0].fixed_fee_cents, 438);
    assert.equal(companyAChannels.results[0].active, 1);

    const saleValueCents = 8500;
    const matchingRange = await db
      .prepare(
        `SELECT percentage_fee_bps, fixed_fee_cents
        FROM sales_channel_fee_ranges
        WHERE sales_channel_id = ?
          AND min_sale_cents <= ?
          AND (max_sale_cents IS NULL OR max_sale_cents >= ?)
        ORDER BY position
        LIMIT 1`,
      )
      .bind("channel-a", saleValueCents, saleValueCents)
      .first();

    assert.equal(matchingRange.percentage_fee_bps, 1400);
    assert.equal(matchingRange.fixed_fee_cents, 1600);
    const totalFeeCents = Math.round(saleValueCents * matchingRange.percentage_fee_bps / 10_000)
      + matchingRange.fixed_fee_cents;
    assert.equal(totalFeeCents, 2790);
  } finally {
    await miniflare.dispose();
  }
});
