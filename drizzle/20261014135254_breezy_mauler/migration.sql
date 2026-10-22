ALTER TABLE `places` ADD `payment_methods` text DEFAULT '["Cash"]';--> statement-breakpoint
ALTER TABLE `places` ADD `schedule_open` text;--> statement-breakpoint
ALTER TABLE `places` ADD `schedule_close` text;--> statement-breakpoint
ALTER TABLE `places` ADD `contact_number` text;--> statement-breakpoint
ALTER TABLE `places` ADD `contact_person` text;