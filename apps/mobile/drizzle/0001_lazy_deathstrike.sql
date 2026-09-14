CREATE INDEX `outbox_status_created_idx` ON `outbox` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `outbox_entity_idx` ON `outbox` (`entity_id`);--> statement-breakpoint
CREATE INDEX `time_entries_deleted_checkin_idx` ON `time_entries` (`is_deleted`,`check_in`);