CREATE TABLE `places` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`address` text,
	`city` text,
	`notes` text,
	`is_favorite` integer DEFAULT false NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `offerings` (
	`id` text PRIMARY KEY,
	`place_id` text NOT NULL,
	`name` text NOT NULL,
	`price` real NOT NULL,
	`item_type` text DEFAULT 'good' NOT NULL,
	`is_recommended` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_offerings_place_id_places_id_fk` FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` text PRIMARY KEY,
	`place_id` text NOT NULL,
	`visited_at` text NOT NULL,
	`amount_spent` real NOT NULL,
	`items_summary` text,
	`transport_mode` text,
	`rating` integer,
	`notes` text,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_visits_place_id_places_id_fk` FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
DROP TABLE `users_table`;