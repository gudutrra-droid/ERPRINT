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
      legalName: companies.legalName,
      cnpj: companies.cnpj,
      stateRegistration: companies.stateRegistration,
      municipalRegistration: companies.municipalRegistration,
      segment: companies.segment,
      phone: companies.phone,
      businessEmail: companies.businessEmail,
      website: companies.website,
      postalCode: companies.postalCode,
      street: companies.street,
      addressNumber: companies.addressNumber,
      addressComplement: companies.addressComplement,
      district: companies.district,
      city: companies.city,
      state: companies.state,
      country: companies.country,
      taxRegime: companies.taxRegime,
      taxRateBps: companies.taxRateBps,
      electricityRateCents: companies.electricityRateCents,
      monthlyFixedCostsCents: companies.monthlyFixedCostsCents,
      defaultProfitMarginBps: companies.defaultProfitMarginBps,
      currency: companies.currency,
      timezone: companies.timezone,
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
