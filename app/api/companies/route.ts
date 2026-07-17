import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { getCompanyForUser } from "../../../db/companies";
import { companies, companyMembers } from "../../../db/schema";
import { getAppUser } from "../../current-user";

const segments = new Set(["3d-printing", "maker", "manufacturing", "retail", "other"]);

function onboardingError(request: Request, message: string) {
  const url = new URL("/onboarding", request.url);
  url.searchParams.set("error", message);
  return Response.redirect(url, 303);
}

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const existing = await getCompanyForUser(user);
  if (existing) return Response.redirect(new URL("/dashboard", request.url), 303);

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").replace(/\D/g, "");
  const segment = String(formData.get("segment") ?? "");

  if (name.length < 2 || name.length > 120) {
    return onboardingError(request, "Informe um nome de empresa entre 2 e 120 caracteres.");
  }
  if (cnpj && cnpj.length !== 14) {
    return onboardingError(request, "O CNPJ precisa ter 14 números.");
  }
  if (!segments.has(segment)) {
    return onboardingError(request, "Selecione um segmento válido.");
  }

  const email = user.email.toLowerCase();
  const companyId = crypto.randomUUID();
  const db = getDb();

  try {
    await db.batch([
      db.insert(companies).values({ id: companyId, name, cnpj: cnpj || null, segment, ownerEmail: email }),
      db.insert(companyMembers).values({
        id: crypto.randomUUID(),
        companyId,
        userEmail: email,
        authUserId: user.provider === "password" ? user.id : null,
        displayName: user.fullName,
        role: "owner",
      }),
    ]);
  } catch (error) {
    const duplicate = error instanceof Error && /unique|constraint/i.test(error.message);
    if (duplicate) {
      const nowExisting = await getCompanyForUser(user);
      if (nowExisting) return Response.redirect(new URL("/dashboard", request.url), 303);

      const [owner] = await db.select({ id: companies.id }).from(companies).where(eq(companies.ownerEmail, email)).limit(1);
      if (owner) {
        return onboardingError(
          request,
          "Este e-mail já está vinculado a uma empresa por outro método de acesso.",
        );
      }
      return onboardingError(request, "Este CNPJ já está vinculado a outra empresa.");
    }
    throw error;
  }

  return Response.redirect(new URL("/dashboard", request.url), 303);
}
