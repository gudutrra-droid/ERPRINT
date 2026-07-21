CREATE TABLE `product_supplies` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`supply_id` text NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`supply_id`) REFERENCES `supplies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_supplies_product_id_idx` ON `product_supplies` (`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_supplies_product_supply_unique` ON `product_supplies` (`product_id`,`supply_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`image_url` text,
	`product_type` text DEFAULT 'production' NOT NULL,
	`purchase_cost_cents` integer DEFAULT 0 NOT NULL,
	`printer_id` text,
	`filament_id` text,
	`print_time_hours` integer DEFAULT 0 NOT NULL,
	`print_time_minutes` integer DEFAULT 0 NOT NULL,
	`filament_grams` real DEFAULT 0 NOT NULL,
	`sale_price_cents` integer DEFAULT 0 NOT NULL,
	`sales_channel_id` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`printer_id`) REFERENCES `printers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`filament_id`) REFERENCES `filaments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`sales_channel_id`) REFERENCES `sales_channels`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `products_company_id_idx` ON `products` (`company_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_company_name_unique` ON `products` (`company_id`,`name`);