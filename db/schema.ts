import { sql } from "drizzle-orm";
import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const companies = sqliteTable(
  "companies",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    cnpj: text("cnpj"),
    segment: text("segment").notNull(),
    ownerEmail: text("owner_email").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("companies_owner_email_unique").on(table.ownerEmail),
    uniqueIndex("companies_cnpj_unique").on(table.cnpj),
  ],
);

export const companyMembers = sqliteTable(
  "company_members",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    displayName: text("display_name"),
    role: text("role").notNull().default("owner"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("company_members_company_user_unique").on(table.companyId, table.userEmail),
    uniqueIndex("company_members_user_email_unique").on(table.userEmail),
  ],
);

export type Company = typeof companies.$inferSelect;
