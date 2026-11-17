-- Bounded reminder traversal and observed recruitment scheduler stages.
CREATE TABLE recruitment_scheduler_state (id TEXT PRIMARY KEY,cursor_user_id TEXT NOT NULL DEFAULT '',cursor_notice_id TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE recruitment_scheduler_runs (id TEXT PRIMARY KEY,stage TEXT NOT NULL,started_at TEXT NOT NULL,completed_at TEXT,outcome TEXT NOT NULL CHECK(outcome IN('running','completed','failed')),processed INTEGER NOT NULL DEFAULT 0,error_code TEXT);
--> statement-breakpoint
CREATE INDEX recruitment_scheduler_runs_completed_idx ON recruitment_scheduler_runs(stage,completed_at);
--> statement-breakpoint
