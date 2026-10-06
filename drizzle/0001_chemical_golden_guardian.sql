ALTER TABLE `rooms` ADD `is_public` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_rooms_public_created` ON `rooms` (`is_public`,`created`);