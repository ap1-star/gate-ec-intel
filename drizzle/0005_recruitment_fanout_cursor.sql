-- Resume candidate fanout across bounded scheduler invocations; no user seed data.
ALTER TABLE recruitment_notice_events ADD COLUMN fanout_cursor TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
