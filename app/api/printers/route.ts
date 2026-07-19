import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { getCompanyForUser } from "../../../db/companies";
import { printers } from "../../../db/schema";
import { getAppUser } from "../../current-user";

function printersRedirect(
  request: Request,
  key: "success" | "error",
  message: string,
  editId?: string,
) {
  const url = new URL("/cadastros/impressoras", request.url);
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
  const printerId = String(formData.get("printerId") ?? "").trim();
  const db = getDb();

  const ownedPrinter = printerId
    ? await db
        .select({ id: printers.id, active: printers.active })
        .from(printers)
        .where(and(eq(printers.id, printerId), eq(printers.companyId, company.id)))
        .limit(1)
        .then(([printer]) => printer ?? null)
    : null;

  if (intent === "toggle") {
    if (!ownedPrinter) return printersRedirect(request, "error", "Impressora não encontrada.");
    await db
      .update(printers)
      .set({ active: !ownedPrinter.active, updatedAt: new Date().toISOString() })
      .where(and(eq(printers.id, ownedPrinter.id), eq(printers.companyId, company.id)));
    return printersRedirect(
      request,
      "success",
      ownedPrinter.active ? "Impressora desativada." : "Impressora ativada.",
    );
  }

  try {
    const name = String(formData.get("name") ?? "").trim();
    const brand = String(formData.get("brand") ?? "").trim();
    const model = String(formData.get("model") ?? "").trim();
    const powerWhPerHour = decimalValue(formData.get("powerWhPerHour"));
    const purchasePrice = decimalValue(formData.get("purchasePrice"));
    const usefulLifeHours = Number(String(formData.get("usefulLifeHours") ?? "").trim());

    if (name.length < 2 || name.length > 80) {
      throw new Error("Informe um nome entre 2 e 80 caracteres.");
    }
    if (brand.length < 2 || brand.length > 80) {
      throw new Error("Informe uma marca entre 2 e 80 caracteres.");
    }
    if (model.length < 1 || model.length > 100) {
      throw new Error("Informe um modelo entre 1 e 100 caracteres.");
    }
    if (!Number.isFinite(powerWhPerHour) || powerWhPerHour <= 0 || powerWhPerHour > 100_000) {
      throw new Error("Informe um consumo energético entre 1 e 100.000 Wh/h.");
    }
    if (!Number.isFinite(purchasePrice) || purchasePrice <= 0 || purchasePrice > 100_000_000) {
      throw new Error("Informe um valor de aquisição válido.");
    }
    if (!Number.isInteger(usefulLifeHours) || usefulLifeHours < 1 || usefulLifeHours > 1_000_000) {
      throw new Error("Informe uma vida útil entre 1 e 1.000.000 de horas.");
    }

    const values = {
      name,
      brand,
      model,
      powerWatts: Math.round(powerWhPerHour),
      purchasePriceCents: Math.round(purchasePrice * 100),
      usefulLifeHours,
      updatedAt: new Date().toISOString(),
    };

    if (printerId) {
      if (!ownedPrinter) return printersRedirect(request, "error", "Impressora não encontrada.");
      await db
        .update(printers)
        .set(values)
        .where(and(eq(printers.id, ownedPrinter.id), eq(printers.companyId, company.id)));
      return printersRedirect(request, "success", "Impressora atualizada.");
    }

    await db.insert(printers).values({
      id: crypto.randomUUID(),
      companyId: company.id,
      ...values,
    });
    return printersRedirect(request, "success", "Impressora cadastrada.");
  } catch (error) {
    const duplicate = error instanceof Error && /unique|constraint/i.test(error.message);
    const message = duplicate
      ? "Já existe uma impressora com esse nome."
      : error instanceof Error
        ? error.message
        : "Não foi possível salvar a impressora.";
    return printersRedirect(request, "error", message, printerId || undefined);
  }
}
