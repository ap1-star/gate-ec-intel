-- Append-only observation field. Zero means no attempt count was recorded by an older runner.
ALTER TABLE reminder_deliveries ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
