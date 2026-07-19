import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { getCompanyForUser } from "../../../db/companies";
import { supplies } from "../../../db/schema";
import { getAppUser } from "../../current-user";

const categories = new Set(["packaging", "hardware", "finishing", "electronics", "adhesive", "other"]);

function suppliesRedirect(
  request: Request,
  key: "success" | "error",
  message: string,
  editId?: string,
) {
  const url = new URL("/cadastros/insumos", request.url);
  url.searchParams.set(key, message);
  if (editId) url.searchParams.set("edit", editId);
  return Response.redirect(url, 303);
}

function decimalValue(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  return Number(normalized);
}

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const company = await getCompanyForUser(user);
  if (!company) return Response.redirect(new URL("/onboarding", request.url), 303);

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "save");
  const supplyId = String(formData.get("supplyId") ?? "").trim();
  const db = getDb();

  const ownedSupply = supplyId
    ? await db
        .select({ id: supplies.id, active: supplies.active })
        .from(supplies)
        .where(and(eq(supplies.id, supplyId), eq(supplies.companyId, company.id)))
        .limit(1)
        .then(([supply]) => supply ?? null)
    : null;

  if (intent === "toggle") {
    if (!ownedSupply) return suppliesRedirect(request, "error", "Insumo não encontrado.");
    await db
      .update(supplies)
      .set({ active: !ownedSupply.active, updatedAt: new Date().toISOString() })
      .where(and(eq(supplies.id, ownedSupply.id), eq(supplies.companyId, company.id)));
    return suppliesRedirect(
      request,
      "success",
      ownedSupply.active ? "Insumo desativado." : "Insumo ativado.",
    );
  }

  try {
    const name = String(formData.get("name") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const unitPrice = decimalValue(formData.get("unitPrice"));

    if (name.length < 2 || name.length > 100) {
      throw new Error("Informe um nome entre 2 e 100 caracteres.");
    }
    if (!categories.has(category)) throw new Error("Selecione uma categoria válida.");
    if (!Number.isFinite(unitPrice) || unitPrice < 0.0001 || unitPrice > 1_000_000) {
      throw new Error("Informe um valor unitário válido.");
    }

    const values = {
      name,
      category,
      unitPriceTenThousandths: Math.round(unitPrice * 10_000),
      updatedAt: new Date().toISOString(),
    };

    if (supplyId) {
      if (!ownedSupply) return suppliesRedirect(request, "error", "Insumo não encontrado.");
      await db
        .update(supplies)
        .set(values)
        .where(and(eq(supplies.id, ownedSupply.id), eq(supplies.companyId, company.id)));
      return suppliesRedirect(request, "success", "Insumo atualizado.");
    }

    await db.insert(supplies).values({
      id: crypto.randomUUID(),
      companyId: company.id,
      ...values,
    });
    return suppliesRedirect(request, "success", "Insumo cadastrado.");
  } catch (error) {
    const duplicate = error instanceof Error && /unique|constraint/i.test(error.message);
    const message = duplicate
      ? "Já existe um insumo com esse nome."
      : error instanceof Error
        ? error.message
        : "Não foi possível salvar o insumo.";
    return suppliesRedirect(request, "error", message, supplyId || undefined);
  }
}
