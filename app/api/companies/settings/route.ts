import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { getCompanyForUser } from "../../../../db/companies";
import { companies } from "../../../../db/schema";
import { getAppUser } from "../../../current-user";

const segments = new Set(["3d-printing", "maker", "manufacturing", "retail", "other"]);
const taxRegimes = new Set(["mei", "simples_nacional", "lucro_presumido", "lucro_real", "other"]);
const currencies = new Set(["BRL", "USD", "EUR"]);
const timezones = new Set(["America/Sao_Paulo", "America/Manaus", "America/Cuiaba", "America/Rio_Branco"]);

function settingsRedirect(request: Request, key: "success" | "error", message: string) {
  const url = new URL("/configuracoes/empresa", request.url);
  url.searchParams.set(key, message);
  return Response.redirect(url, 303);
}

function optionalText(formData: FormData, key: string, maxLength: number) {
  const value = String(formData.get(key) ?? "").trim();
  if (value.length > maxLength) throw new Error(`O campo ${key} excede o limite permitido.`);
  return value || null;
}

function decimalValue(formData: FormData, key: string, max: number) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw new Error(`Informe um valor válido para ${key}.`);
  }
  return value;
}

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const company = await getCompanyForUser(user);
  if (!company) return Response.redirect(new URL("/onboarding", request.url), 303);

  try {
    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const cnpj = String(formData.get("cnpj") ?? "").replace(/\D/g, "");
    const postalCode = String(formData.get("postalCode") ?? "").replace(/\D/g, "");
    const state = String(formData.get("state") ?? "").trim().toUpperCase();
    const segment = String(formData.get("segment") ?? "");
    const taxRegime = String(formData.get("taxRegime") ?? "");
    const currency = String(formData.get("currency") ?? "");
    const timezone = String(formData.get("timezone") ?? "");
    const businessEmail = optionalText(formData, "businessEmail", 160);
    const website = optionalText(formData, "website", 240);

    if (name.length < 2 || name.length > 120) {
      throw new Error("Informe um nome de empresa entre 2 e 120 caracteres.");
    }
    if (cnpj && cnpj.length !== 14) throw new Error("O CNPJ precisa ter 14 números.");
    if (postalCode && postalCode.length !== 8) throw new Error("O CEP precisa ter 8 números.");
    if (state && !/^[A-Z]{2}$/.test(state)) throw new Error("Informe a UF com duas letras.");
    if (!segments.has(segment)) throw new Error("Selecione um segmento válido.");
    if (!taxRegimes.has(taxRegime)) throw new Error("Selecione um regime tributário válido.");
    if (!currencies.has(currency)) throw new Error("Selecione uma moeda válida.");
    if (!timezones.has(timezone)) throw new Error("Selecione um fuso horário válido.");
    if (businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
      throw new Error("Informe um e-mail comercial válido.");
    }
    if (website) {
      try {
        const parsed = new URL(website);
        if (!new Set(["http:", "https:"]).has(parsed.protocol)) throw new Error();
      } catch {
        throw new Error("Informe o site completo, começando com http:// ou https://.");
      }
    }

    const taxRateBps = Math.round(decimalValue(formData, "taxRate", 100) * 100);
    const electricityRateCents = Math.round(decimalValue(formData, "electricityRate", 1000) * 100);
    const monthlyFixedCostsCents = Math.round(decimalValue(formData, "monthlyFixedCosts", 1_000_000_000) * 100);
    const defaultProfitMarginBps = Math.round(decimalValue(formData, "defaultProfitMargin", 1000) * 100);

    await getDb()
      .update(companies)
      .set({
        name,
        legalName: optionalText(formData, "legalName", 160),
        cnpj: cnpj || null,
        stateRegistration: optionalText(formData, "stateRegistration", 30),
        municipalRegistration: optionalText(formData, "municipalRegistration", 30),
        segment,
        phone: optionalText(formData, "phone", 30),
        businessEmail,
        website,
        postalCode: postalCode || null,
        street: optionalText(formData, "street", 160),
        addressNumber: optionalText(formData, "addressNumber", 20),
        addressComplement: optionalText(formData, "addressComplement", 100),
        district: optionalText(formData, "district", 100),
        city: optionalText(formData, "city", 100),
        state: state || null,
        country: optionalText(formData, "country", 80) ?? "Brasil",
        taxRegime,
        taxRateBps,
        electricityRateCents,
        monthlyFixedCostsCents,
        defaultProfitMarginBps,
        currency,
        timezone,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(companies.id, company.id));

    return settingsRedirect(request, "success", "Dados da empresa atualizados.");
  } catch (error) {
    const duplicate = error instanceof Error && /unique|constraint/i.test(error.message);
    const message = duplicate
      ? "Este CNPJ já está vinculado a outra empresa."
      : error instanceof Error
        ? error.message
        : "Não foi possível salvar os dados da empresa.";
    return settingsRedirect(request, "error", message);
  }
}
