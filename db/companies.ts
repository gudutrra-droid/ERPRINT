import { and, eq, isNull } from "drizzle-orm";
import type { AppUser } from "../app/current-user";
import { getDb } from ".";
import { companies, companyMembers } from "./schema";

export async function getCompanyForUser(user: AppUser) {
  const db = getDb();
  const ownership =
    user.provider === "password"
      ? eq(companyMembers.authUserId, user.id)
      : and(
          eq(companyMembers.userEmail, user.email.toLowerCase()),
          isNull(companyMembers.authUserId),
        );

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
    .where(ownership)
    .limit(1);

  return company ?? null;
}
