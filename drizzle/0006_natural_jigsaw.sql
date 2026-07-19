CREATE TABLE `supplies` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`unit_price_ten_thousandths` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `supplies_company_id_idx` ON `supplies` (`company_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `supplies_company_name_unique` ON `supplies` (`company_id`,`name`);