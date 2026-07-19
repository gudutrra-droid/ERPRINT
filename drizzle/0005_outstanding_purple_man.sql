CREATE TABLE `filaments` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`material` text NOT NULL,
	`brand` text,
	`price_per_kg_cents` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `filaments_company_id_idx` ON `filaments` (`company_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `filaments_company_name_unique` ON `filaments` (`company_id`,`name`);