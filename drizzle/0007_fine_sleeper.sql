CREATE TABLE `sales_channel_fee_ranges` (
	`id` text PRIMARY KEY NOT NULL,
	`sales_channel_id` text NOT NULL,
	`min_sale_cents` integer DEFAULT 0 NOT NULL,
	`max_sale_cents` integer,
	`percentage_fee_bps` integer DEFAULT 0 NOT NULL,
	`fixed_fee_cents` integer DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sales_channel_id`) REFERENCES `sales_channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sales_channel_fee_ranges_channel_id_idx` ON `sales_channel_fee_ranges` (`sales_channel_id`);--> statement-breakpoint
CREATE TABLE `sales_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`percentage_fee_bps` integer DEFAULT 0 NOT NULL,
	`fixed_fee_cents` integer DEFAULT 0 NOT NULL,
	`shipping_fee_bps` integer DEFAULT 0 NOT NULL,
	`shipping_fee_cents` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sales_channels_company_id_idx` ON `sales_channels` (`company_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sales_channels_company_name_unique` ON `sales_channels` (`company_id`,`name`);