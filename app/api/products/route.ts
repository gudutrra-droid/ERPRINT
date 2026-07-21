import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { getCompanyForUser } from "../../../db/companies";
import { getProductForCompany } from "../../../db/products";
import { productSupplies, products } from "../../../db/schema";
import { getAppUser } from "../../current-user";

const nowIso = () => new Date().toISOString();

function reais(value: unknown): number {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function intVal(value: unknown): number {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

async function requireCompany() {
  const user = await getAppUser();
  if (!user) return { error: Response.json({ error: "Não autenticado." }, { status: 401 }) };
  const company = await getCompanyForUser(user);
  if (!company) return { error: Response.json({ error: "Empresa não encontrada." }, { status: 400 }) };
  return { company };
}

export async function POST(request: Request) {
  const { company, error } = await requireCompany();
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "save");
  const db = getDb();

  try {
    if (action === "toggle") {
      const existing = await getProductForCompany(company.id, String(body.productId ?? ""));
      if (!existing) return Response.json({ error: "Produto não encontrado." }, { status: 404 });
      await db
        .update(products)
        .set({ active: !existing.active, updatedAt: nowIso() })
        .where(and(eq(products.id, existing.id), eq(products.companyId, company.id)));
      return Response.json({ ok: true });
    }

    if (action === "delete") {
      const existing = await getProductForCompany(company.id, String(body.productId ?? ""));
      if (!existing) return Response.json({ error: "Produto não encontrado." }, { status: 404 });
      await db.delete(products).where(and(eq(products.id, existing.id), eq(products.companyId, company.id)));
      return Response.json({ ok: true });
    }

    // save (criar ou editar)
    const productId = String(body.productId ?? "").trim();
    const name = String(body.name ?? "").trim();
    if (name.length < 2 || name.length > 120) {
      return Response.json({ error: "Informe um nome entre 2 e 120 caracteres." }, { status: 400 });
    }
    const productType = body.productType === "resale" ? "resale" : "production";
    const suppliesInput = Array.isArray(body.supplies) ? body.supplies : [];

    const values = {
      name,
      productType,
      purchaseCostCents: productType === "resale" ? Math.round(reais(body.purchaseCost) * 100) : 0,
      printerId: productType === "production" ? (String(body.printerId ?? "") || null) : null,
      filamentId: productType === "production" ? (String(body.filamentId ?? "") || null) : null,
      printTimeHours: productType === "production" ? Math.max(0, intVal(body.printTimeHours)) : 0,
      printTimeMinutes: productType === "production" ? Math.min(59, Math.max(0, intVal(body.printTimeMinutes))) : 0,
      filamentGrams: productType === "production" ? Math.max(0, reais(body.filamentGrams)) : 0,
      salePriceCents: Math.round(reais(body.salePrice) * 100),
      salesChannelId: String(body.salesChannelId ?? "") || null,
      updatedAt: nowIso(),
    };

    let savedId = productId;
    if (productId) {
      const existing = await getProductForCompany(company.id, productId);
      if (!existing) return Response.json({ error: "Produto não encontrado." }, { status: 404 });
      await db.update(products).set(values).where(and(eq(products.id, productId), eq(products.companyId, company.id)));
    } else {
      savedId = crypto.randomUUID();
      await db.insert(products).values({ id: savedId, companyId: company.id, ...values });
    }

    // Reescreve os insumos do produto
    await db.delete(productSupplies).where(eq(productSupplies.productId, savedId));
    const rows = suppliesInput
      .map((s) => {
        const item = s as Record<string, unknown>;
        const supplyId = String(item.supplyId ?? "").trim();
        const quantity = reais(item.quantity);
        return supplyId && quantity > 0
          ? { id: crypto.randomUUID(), productId: savedId, supplyId, quantity }
          : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (rows.length > 0) await db.insert(productSupplies).values(rows);

    return Response.json({ ok: true, id: savedId });
  } catch (e) {
    const message =
      e instanceof Error && /unique|constraint/i.test(e.message)
        ? "Já existe um produto com esse nome."
        : e instanceof Error
          ? e.message
          : "Não foi possível salvar o produto.";
    return Response.json({ error: message }, { status: 500 });
  }
}
