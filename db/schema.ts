import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

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

// ── Produtos ─────────────────────────────────────────────────────
export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    // "production" (impresso 3D) | "resale" (revenda)
    productType: text("product_type").notNull().default("production"),
    purchaseCostCents: integer("purchase_cost_cents").notNull().default(0),
    printerId: text("printer_id").references(() => printers.id, { onDelete: "set null" }),
    filamentId: text("filament_id").references(() => filaments.id, { onDelete: "set null" }),
    printTimeHours: integer("print_time_hours").notNull().default(0),
    printTimeMinutes: integer("print_time_minutes").notNull().default(0),
    filamentGrams: real("filament_grams").notNull().default(0),
    // Peças produzidas por impressão (lote): tempo e filamento acima são o TOTAL
    // do lote; o custo por peça divide por este número. 1 = impressão unitária.
    batchUnits: integer("batch_units").notNull().default(1),
    salePriceCents: integer("sale_price_cents").notNull().default(0),
    salesChannelId: text("sales_channel_id").references(() => salesChannels.id, {
      onDelete: "set null",
    }),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("products_company_id_idx").on(table.companyId),
    uniqueIndex("products_company_name_unique").on(table.companyId, table.name),
  ],
);

export const productSupplies = sqliteTable(
  "product_supplies",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    supplyId: text("supply_id")
      .notNull()
      .references(() => supplies.id, { onDelete: "cascade" }),
    quantity: real("quantity").notNull().default(1),
  },
  (table) => [
    index("product_supplies_product_id_idx").on(table.productId),
    uniqueIndex("product_supplies_product_supply_unique").on(table.productId, table.supplyId),
  ],
);

// ── Shopee: chaves da Open Platform API por empresa ──────────────
export const shopeeConfigs = sqliteTable(
  "shopee_configs",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    partnerId: text("partner_id"),
    partnerKey: text("partner_key"),
    environment: text("environment").notNull().default("production"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("shopee_configs_company_unique").on(table.companyId)],
);

// ── Shopee: loja autorizada (integração) ─────────────────────────
export const shopeeIntegrations = sqliteTable(
  "shopee_integrations",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    shopId: text("shop_id").notNull(),
    shopName: text("shop_name"),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    tokenExpiresAt: text("token_expires_at").notNull(),
    environment: text("environment").notNull().default("production"),
    salesChannelId: text("sales_channel_id").references(() => salesChannels.id, {
      onDelete: "set null",
    }),
    autoSyncSales: integer("auto_sync_sales", { mode: "boolean" }).notNull().default(true),
    syncIntervalS: integer("sync_interval_s").notNull().default(60),
    autoSyncAds: integer("auto_sync_ads", { mode: "boolean" }).notNull().default(true),
    adsSyncIntervalS: integer("ads_sync_interval_s").notNull().default(60),
    lastSyncAt: text("last_sync_at"),
    lastAdsSyncAt: text("last_ads_sync_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("shopee_integrations_company_id_idx").on(table.companyId),
    uniqueIndex("shopee_integrations_company_shop_unique").on(table.companyId, table.shopId),
  ],
);

// ── Shopee: itens vistos em pedidos aguardando vínculo com produto ─
export const shopeePendingItems = sqliteTable(
  "shopee_pending_items",
  {
    id: text("id").primaryKey(),
    integrationId: text("integration_id")
      .notNull()
      .references(() => shopeeIntegrations.id, { onDelete: "cascade" }),
    shopeeItemId: text("shopee_item_id").notNull(),
    shopeeModelId: text("shopee_model_id").notNull().default("0"),
    shopeeItemName: text("shopee_item_name"),
    shopeeSku: text("shopee_sku"),
    shopeeImageUrl: text("shopee_image_url"),
    occurrences: integer("occurrences").notNull().default(1),
    lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("shopee_pending_unique").on(
      table.integrationId,
      table.shopeeItemId,
      table.shopeeModelId,
    ),
  ],
);

// ── Shopee: vínculo anúncio → produto (produto chega em módulo futuro) ─
export const shopeeProductMappings = sqliteTable(
  "shopee_product_mappings",
  {
    id: text("id").primaryKey(),
    integrationId: text("integration_id")
      .notNull()
      .references(() => shopeeIntegrations.id, { onDelete: "cascade" }),
    shopeeItemId: text("shopee_item_id").notNull(),
    shopeeModelId: text("shopee_model_id").notNull().default("0"),
    shopeeItemName: text("shopee_item_name"),
    shopeeSku: text("shopee_sku"),
    productId: text("product_id"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("shopee_mapping_unique").on(
      table.integrationId,
      table.shopeeItemId,
      table.shopeeModelId,
    ),
  ],
);

// ── Shopee: histórico de sincronizações ──────────────────────────
export const shopeeSyncLogs = sqliteTable(
  "shopee_sync_logs",
  {
    id: text("id").primaryKey(),
    integrationId: text("integration_id")
      .notNull()
      .references(() => shopeeIntegrations.id, { onDelete: "cascade" }),
    syncType: text("sync_type").notNull(),
    status: text("status").notNull(),
    message: text("message"),
    ordersImported: integer("orders_imported").notNull().default(0),
    ordersPending: integer("orders_pending").notNull().default(0),
    startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    finishedAt: text("finished_at"),
  },
  (table) => [index("shopee_sync_logs_integration_id_idx").on(table.integrationId)],
);

// ── Vendas ───────────────────────────────────────────────────────
export const sales = sqliteTable(
  "sales",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    saleDate: text("sale_date").notNull(),
    quantity: integer("quantity").notNull().default(1),
    saleValueCents: integer("sale_value_cents").notNull(),
    salesChannelId: text("sales_channel_id").references(() => salesChannels.id, {
      onDelete: "set null",
    }),
    orderNumber: text("order_number"),
    shopeeOrderSn: text("shopee_order_sn"),
    orderStatus: text("order_status"),
    buyerUsername: text("buyer_username"),
    source: text("source").notNull().default("manual"),
    itemName: text("item_name"),
    itemSku: text("item_sku"),
    imageUrl: text("image_url"),
    productId: text("product_id"),
    snapshotProductionCostCents: integer("snapshot_production_cost_cents"),
    snapshotChannelCostCents: integer("snapshot_channel_cost_cents"),
    snapshotTaxCostCents: integer("snapshot_tax_cost_cents"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("sales_company_id_idx").on(table.companyId),
    index("sales_company_date_idx").on(table.companyId, table.saleDate),
    uniqueIndex("sales_shopee_order_sn_unique").on(table.shopeeOrderSn),
  ],
);

// ── Gasto com anúncios (ADS): um registro por empresa/dia/origem ──
export const adSpend = sqliteTable(
  "ad_spend",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    spendDate: text("spend_date").notNull(),
    amountCents: integer("amount_cents").notNull().default(0),
    source: text("source").notNull().default("shopee"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("ad_spend_company_id_idx").on(table.companyId),
    uniqueIndex("ad_spend_company_date_source_unique").on(
      table.companyId,
      table.spendDate,
      table.source,
    ),
  ],
);

export type Company = typeof companies.$inferSelect;
export type Printer = typeof printers.$inferSelect;
export type Filament = typeof filaments.$inferSelect;
export type Supply = typeof supplies.$inferSelect;
export type SalesChannel = typeof salesChannels.$inferSelect;
export type SalesChannelFeeRange = typeof salesChannelFeeRanges.$inferSelect;
export type ShopeeConfig = typeof shopeeConfigs.$inferSelect;
export type ShopeeIntegration = typeof shopeeIntegrations.$inferSelect;
export type ShopeePendingItem = typeof shopeePendingItems.$inferSelect;
export type ShopeeSyncLog = typeof shopeeSyncLogs.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type AdSpend = typeof adSpend.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductSupply = typeof productSupplies.$inferSelect;
