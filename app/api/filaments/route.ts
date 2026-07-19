import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { getCompanyForUser } from "../../../db/companies";
import { filaments } from "../../../db/schema";
import { getAppUser } from "../../current-user";

const materials = new Set(["PLA", "PETG", "ABS", "ASA", "TPU", "PA", "PC", "HIPS", "PVA", "OTHER"]);

function filamentsRedirect(
  request: Request,
  key: "success" | "error",
  message: string,
  editId?: string,
) {
  const url = new URL("/cadastros/filamentos", request.url);
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
  const filamentId = String(formData.get("filamentId") ?? "").trim();
  const db = getDb();

  const ownedFilament = filamentId
    ? await db
        .select({ id: filaments.id, active: filaments.active })
        .from(filaments)
        .where(and(eq(filaments.id, filamentId), eq(filaments.companyId, company.id)))
        .limit(1)
        .then(([filament]) => filament ?? null)
    : null;

  if (intent === "toggle") {
    if (!ownedFilament) return filamentsRedirect(request, "error", "Filamento não encontrado.");
    await db
      .update(filaments)
      .set({ active: !ownedFilament.active, updatedAt: new Date().toISOString() })
      .where(and(eq(filaments.id, ownedFilament.id), eq(filaments.companyId, company.id)));
    return filamentsRedirect(
      request,
      "success",
      ownedFilament.active ? "Filamento desativado." : "Filamento ativado.",
    );
  }

  try {
    const name = String(formData.get("name") ?? "").trim();
    const material = String(formData.get("material") ?? "").trim().toUpperCase();
    const brandValue = String(formData.get("brand") ?? "").trim();
    const pricePerKg = decimalValue(formData.get("pricePerKg"));

    if (name.length < 2 || name.length > 80) {
      throw new Error("Informe um nome entre 2 e 80 caracteres.");
    }
    if (!materials.has(material)) throw new Error("Selecione um material válido.");
    if (brandValue.length > 80) throw new Error("A marca deve ter no máximo 80 caracteres.");
    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0 || pricePerKg > 1_000_000) {
      throw new Error("Informe um valor por quilo válido.");
    }

    const values = {
      name,
      material,
      brand: brandValue || null,
      pricePerKgCents: Math.round(pricePerKg * 100),
      updatedAt: new Date().toISOString(),
    };

    if (filamentId) {
      if (!ownedFilament) return filamentsRedirect(request, "error", "Filamento não encontrado.");
      await db
        .update(filaments)
        .set(values)
        .where(and(eq(filaments.id, ownedFilament.id), eq(filaments.companyId, company.id)));
      return filamentsRedirect(request, "success", "Filamento atualizado.");
    }

    await db.insert(filaments).values({
      id: crypto.randomUUID(),
      companyId: company.id,
      ...values,
    });
    return filamentsRedirect(request, "success", "Filamento cadastrado.");
  } catch (error) {
    const duplicate = error instanceof Error && /unique|constraint/i.test(error.message);
    const message = duplicate
      ? "Já existe um filamento com esse nome."
      : error instanceof Error
        ? error.message
        : "Não foi possível salvar o filamento.";
    return filamentsRedirect(request, "error", message, filamentId || undefined);
  }
}
