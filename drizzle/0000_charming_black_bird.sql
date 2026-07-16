CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cnpj` text,
	`segment` text NOT NULL,
	`owner_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_owner_email_unique` ON `companies` (`owner_email`);--> statement-breakpoint
CREATE UNIQUE INDEX `companies_cnpj_unique` ON `companies` (`cnpj`);--> statement-breakpoint
CREATE TABLE `company_members` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_email` text NOT NULL,
	`display_name` text,
	`role` text DEFAULT 'owner' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_members_company_user_unique` ON `company_members` (`company_id`,`user_email`);--> statement-breakpoint
CREATE UNIQUE INDEX `company_members_user_email_unique` ON `company_members` (`user_email`);