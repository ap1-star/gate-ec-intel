CREATE TABLE recruitment_runner_state (
 id TEXT PRIMARY KEY,
 next_phase INTEGER NOT NULL DEFAULT 0 CHECK(next_phase BETWEEN 0 AND 3),
 lease_token TEXT,
 lease_until TEXT,
 last_run_at TEXT,
 last_success_at TEXT,
 last_error TEXT
);
--> statement-breakpoint
