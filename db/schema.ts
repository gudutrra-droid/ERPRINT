import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const authUsers = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
    image: text("image"),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [uniqueIndex("auth_user_email_unique").on(table.email)],
);

export const authSessions = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: text("expiresAt").notNull(),
    token: text("token").notNull(),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("auth_session_token_unique").on(table.token),
    index("auth_session_user_id_idx").on(table.userId),
  ],
);

export const authAccounts = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: text("accessTokenExpiresAt"),
    refreshTokenExpiresAt: text("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [index("auth_account_user_id_idx").on(table.userId)],
);

export const authVerifications = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: text("expiresAt").notNull(),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [index("auth_verification_identifier_idx").on(table.identifier)],
);

export const authRateLimits = sqliteTable(
  "rateLimit",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    count: integer("count").notNull(),
    lastRequest: integer("lastRequest").notNull(),
  },
  (table) => [uniqueIndex("auth_rate_limit_key_unique").on(table.key)],
);

export const companies = sqliteTable(
  "companies",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    cnpj: text("cnpj"),
    stateRegistration: text("state_registration"),
    municipalRegistration: text("municipal_registration"),
    segment: text("segment").notNull(),
    phone: text("phone"),
    businessEmail: text("business_email"),
    website: text("website"),
    postalCode: text("postal_code"),
    street: text("street"),
    addressNumber: text("address_number"),
    addressComplement: text("address_complement"),
    district: text("district"),
    city: text("city"),
    state: text("state"),
    country: text("country").notNull().default("Brasil"),
    taxRegime: text("tax_regime").notNull().default("simples_nacional"),
    taxRateBps: integer("tax_rate_bps").notNull().default(0),
    electricityRateCents: integer("electricity_rate_cents").notNull().default(0),
    monthlyFixedCostsCents: integer("monthly_fixed_costs_cents").notNull().default(0),
    defaultProfitMarginBps: integer("default_profit_margin_bps").notNull().default(0),
    currency: text("currency").notNull().default("BRL"),
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),
    ownerEmail: text("owner_email").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("companies_owner_email_unique").on(table.ownerEmail),
    uniqueIndex("companies_cnpj_unique").on(table.cnpj),
  ],
);

export const printers = sqliteTable(
  "printers",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    powerWatts: integer("power_watts").notNull(),
    purchasePriceCents: integer("purchase_price_cents").notNull().default(0),
    usefulLifeHours: integer("useful_life_hours").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("printers_company_id_idx").on(table.companyId),
    uniqueIndex("printers_company_name_unique").on(table.companyId, table.name),
  ],
);

export const filaments = sqliteTable(
  "filaments",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    material: text("material").notNull(),
    brand: text("brand"),
    pricePerKgCents: integer("price_per_kg_cents").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("filaments_company_id_idx").on(table.companyId),
    uniqueIndex("filaments_company_name_unique").on(table.companyId, table.name),
  ],
);

export const supplies = sqliteTable(
  "supplies",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    unitPriceTenThousandths: integer("unit_price_ten_thousandths").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("supplies_company_id_idx").on(table.companyId),
    uniqueIndex("supplies_company_name_unique").on(table.companyId, table.name),
  ],
);

export const salesChannels = sqliteTable(
  "sales_channels",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    percentageFeeBps: integer("percentage_fee_bps").notNull().default(0),
    fixedFeeCents: integer("fixed_fee_cents").notNull().default(0),
    shippingFeeBps: integer("shipping_fee_bps").notNull().default(0),
    shippingFeeCents: integer("shipping_fee_cents").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("sales_channels_company_id_idx").on(table.companyId),
    uniqueIndex("sales_channels_company_name_unique").on(table.companyId, table.name),
  ],
);

export const salesChannelFeeRanges = sqliteTable(
  "sales_channel_fee_ranges",
  {
    id: text("id").primaryKey(),
    salesChannelId: text("sales_channel_id")
      .notNull()
      .references(() => salesChannels.id, { onDelete: "cascade" }),
    minSaleCents: integer("min_sale_cents").notNull().default(0),
    maxSaleCents: integer("max_sale_cents"),
    percentageFeeBps: integer("percentage_fee_bps").notNull().default(0),
    fixedFeeCents: integer("fixed_fee_cents").notNull().default(0),
    position: integer("position").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("sales_channel_fee_ranges_channel_id_idx").on(table.salesChannelId)],
);

export const companyMembers = sqliteTable(
  "company_members",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    authUserId: text("auth_user_id"),
    displayName: text("display_name"),
    role: text("role").notNull().default("owner"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("company_members_company_user_unique").on(table.companyId, table.userEmail),
    uniqueIndex("company_members_user_email_unique").on(table.userEmail),
    uniqueIndex("company_members_auth_user_id_unique").on(table.authUserId),
  ],
);

export type Company = typeof companies.$inferSelect;
export type Printer = typeof printers.$inferSelect;
export type Filament = typeof filaments.$inferSelect;
export type Supply = typeof supplies.$inferSelect;
export type SalesChannel = typeof salesChannels.$inferSelect;
export type SalesChannelFeeRange = typeof salesChannelFeeRanges.$inferSelect;
