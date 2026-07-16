import { eq } from "drizzle-orm";
import { getDb } from ".";
import { companies, companyMembers } from "./schema";

export async function getCompanyForUser(email: string) {
  const db = getDb();
  const [company] = await db
    .select({
      id: companies.id,
      name: companies.name,
      cnpj: companies.cnpj,
      segment: companies.segment,
      ownerEmail: companies.ownerEmail,
      createdAt: companies.createdAt,
      updatedAt: companies.updatedAt,
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companyMembers.companyId, companies.id))
    .where(eq(companyMembers.userEmail, email.toLowerCase()))
    .limit(1);

  return company ?? null;
}
