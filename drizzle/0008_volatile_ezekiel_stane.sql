CREATE TABLE `ad_spend` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`spend_date` text NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'shopee' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ad_spend_company_id_idx` ON `ad_spend` (`company_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ad_spend_company_date_source_unique` ON `ad_spend` (`company_id`,`spend_date`,`source`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`sale_date` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`sale_value_cents` integer NOT NULL,
	`sales_channel_id` text,
	`order_number` text,
	`shopee_order_sn` text,
	`order_status` text,
	`buyer_username` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`item_name` text,
	`item_sku` text,
	`image_url` text,
	`product_id` text,
	`snapshot_production_cost_cents` integer,
	`snapshot_channel_cost_cents` integer,
	`snapshot_tax_cost_cents` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sales_channel_id`) REFERENCES `sales_channels`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `sales_company_id_idx` ON `sales` (`company_id`);--> statement-breakpoint
CREATE INDEX `sales_company_date_idx` ON `sales` (`company_id`,`sale_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `sales_shopee_order_sn_unique` ON `sales` (`shopee_order_sn`);--> statement-breakpoint
CREATE TABLE `shopee_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`partner_id` text,
	`partner_key` text,
	`environment` text DEFAULT 'production' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shopee_configs_company_unique` ON `shopee_configs` (`company_id`);--> statement-breakpoint
CREATE TABLE `shopee_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`shop_id` text NOT NULL,
	`shop_name` text,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`token_expires_at` text NOT NULL,
	`environment` text DEFAULT 'production' NOT NULL,
	`sales_channel_id` text,
	`auto_sync_sales` integer DEFAULT true NOT NULL,
	`sync_interval_s` integer DEFAULT 60 NOT NULL,
	`auto_sync_ads` integer DEFAULT true NOT NULL,
	`ads_sync_interval_s` integer DEFAULT 60 NOT NULL,
	`last_sync_at` text,
	`last_ads_sync_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sales_channel_id`) REFERENCES `sales_channels`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `shopee_integrations_company_id_idx` ON `shopee_integrations` (`company_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `shopee_integrations_company_shop_unique` ON `shopee_integrations` (`company_id`,`shop_id`);--> statement-breakpoint
CREATE TABLE `shopee_pending_items` (
	`id` text PRIMARY KEY NOT NULL,
	`integration_id` text NOT NULL,
	`shopee_item_id` text NOT NULL,
	`shopee_model_id` text DEFAULT '0' NOT NULL,
	`shopee_item_name` text,
	`shopee_sku` text,
	`shopee_image_url` text,
	`occurrences` integer DEFAULT 1 NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`integration_id`) REFERENCES `shopee_integrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shopee_pending_unique` ON `shopee_pending_items` (`integration_id`,`shopee_item_id`,`shopee_model_id`);--> statement-breakpoint
CREATE TABLE `shopee_product_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`integration_id` text NOT NULL,
	`shopee_item_id` text NOT NULL,
	`shopee_model_id` text DEFAULT '0' NOT NULL,
	`shopee_item_name` text,
	`shopee_sku` text,
	`product_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`integration_id`) REFERENCES `shopee_integrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shopee_mapping_unique` ON `shopee_product_mappings` (`integration_id`,`shopee_item_id`,`shopee_model_id`);--> statement-breakpoint
CREATE TABLE `shopee_sync_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`integration_id` text NOT NULL,
	`sync_type` text NOT NULL,
	`status` text NOT NULL,
	`message` text,
	`orders_imported` integer DEFAULT 0 NOT NULL,
	`orders_pending` integer DEFAULT 0 NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`finished_at` text,
	FOREIGN KEY (`integration_id`) REFERENCES `shopee_integrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shopee_sync_logs_integration_id_idx` ON `shopee_sync_logs` (`integration_id`);