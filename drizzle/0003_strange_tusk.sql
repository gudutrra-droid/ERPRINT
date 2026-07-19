CREATE TABLE `printers` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`power_watts` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `printers_company_id_idx` ON `printers` (`company_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `printers_company_name_unique` ON `printers` (`company_id`,`name`);