ALTER TABLE `companies` ADD `legal_name` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `state_registration` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `municipal_registration` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `business_email` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `website` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `postal_code` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `street` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `address_number` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `address_complement` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `district` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `city` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `state` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `country` text DEFAULT 'Brasil' NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `tax_regime` text DEFAULT 'simples_nacional' NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `tax_rate_bps` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `electricity_rate_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `monthly_fixed_costs_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `default_profit_margin_bps` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `currency` text DEFAULT 'BRL' NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `timezone` text DEFAULT 'America/Sao_Paulo' NOT NULL;