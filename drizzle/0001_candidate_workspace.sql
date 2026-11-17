-- Part 2 candidate workspace, SQLite / D1 dialect. Schema only; no user or seed rows.
PRAGMA foreign_keys = ON;
--> statement-breakpoint
CREATE TABLE users (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE dev_credentials (username TEXT PRIMARY KEY COLLATE NOCASE, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, salt TEXT NOT NULL, password_hash TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE dev_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, csrf_token TEXT NOT NULL, expires_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX dev_sessions_user_idx ON dev_sessions(user_id);
--> statement-breakpoint
CREATE TABLE profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, category TEXT NOT NULL CHECK(category IN ('GEN','GEN_EWS','OBC_NCL','SC','ST')), target_year INTEGER NOT NULL, exam_date TEXT, daily_minutes INTEGER NOT NULL CHECK(daily_minutes BETWEEN 1 AND 1440), reminder_preference TEXT NOT NULL CHECK(reminder_preference IN ('none','in_app')), updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE collections (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, UNIQUE(id,user_id), UNIQUE(user_id,name));
--> statement-breakpoint
CREATE TABLE bookmarks (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, target_type TEXT NOT NULL CHECK(target_type IN ('question','paper')), target_id TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(user_id,target_type,target_id), UNIQUE(id,user_id));
--> statement-breakpoint
CREATE TABLE bookmark_collections (bookmark_id TEXT NOT NULL, collection_id TEXT NOT NULL, user_id TEXT NOT NULL, PRIMARY KEY(bookmark_id,collection_id), FOREIGN KEY(bookmark_id,user_id) REFERENCES bookmarks(id,user_id) ON DELETE CASCADE, FOREIGN KEY(collection_id,user_id) REFERENCES collections(id,user_id) ON DELETE CASCADE);
--> statement-breakpoint
CREATE INDEX bookmarks_user_created_idx ON bookmarks(user_id,created_at);
--> statement-breakpoint
CREATE TABLE estimates (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, input_json TEXT NOT NULL, estimate_json TEXT NOT NULL, dataset_version TEXT NOT NULL, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX estimates_user_created_idx ON estimates(user_id,created_at);
--> statement-breakpoint
CREATE TABLE study_plans (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('daily','weekly')), start_date TEXT NOT NULL, end_date TEXT NOT NULL, daily_minutes INTEGER NOT NULL CHECK(daily_minutes BETWEEN 1 AND 1440), created_at TEXT NOT NULL, UNIQUE(id,user_id));
--> statement-breakpoint
CREATE TABLE study_tasks (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, plan_id TEXT NOT NULL, planned_date TEXT NOT NULL, subject TEXT NOT NULL, topic TEXT NOT NULL, minutes INTEGER NOT NULL CHECK(minutes BETWEEN 1 AND 1440), completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)), created_at TEXT NOT NULL, FOREIGN KEY(plan_id,user_id) REFERENCES study_plans(id,user_id) ON DELETE CASCADE);
--> statement-breakpoint
CREATE INDEX study_tasks_user_date_idx ON study_tasks(user_id,planned_date);
--> statement-breakpoint
CREATE TABLE mock_attempts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, taken_at TEXT NOT NULL, score REAL NOT NULL, total REAL NOT NULL CHECK(total>0), duration_minutes INTEGER NOT NULL CHECK(duration_minutes BETWEEN 1 AND 1440), subject_scores_json TEXT NOT NULL, correct_count INTEGER, incorrect_count INTEGER, unattempted_count INTEGER, topic_notes_json TEXT NOT NULL, provenance TEXT NOT NULL DEFAULT 'candidate_entered', created_at TEXT NOT NULL, UNIQUE(id,user_id));
--> statement-breakpoint
CREATE INDEX mock_attempts_user_taken_idx ON mock_attempts(user_id,taken_at);
--> statement-breakpoint
CREATE TABLE reminders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, due_at TEXT NOT NULL, timezone TEXT NOT NULL, cadence TEXT NOT NULL CHECK(cadence IN ('once','daily','weekly')), enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN(0,1)), completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN(0,1)), kind TEXT NOT NULL DEFAULT 'revision' CHECK(kind IN('revision','mock_deadline')), mock_attempt_id TEXT, created_at TEXT NOT NULL, FOREIGN KEY(mock_attempt_id,user_id) REFERENCES mock_attempts(id,user_id));
--> statement-breakpoint
CREATE INDEX reminders_due_idx ON reminders(enabled,due_at);
--> statement-breakpoint
CREATE TABLE reminder_deliveries (id TEXT PRIMARY KEY, reminder_id TEXT NOT NULL REFERENCES reminders(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, occurrence_at TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN('pending','delivered','skipped','failed')), attempted_at TEXT NOT NULL, completed_at TEXT, UNIQUE(reminder_id,occurrence_at));
--> statement-breakpoint
CREATE TABLE notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, source_key TEXT UNIQUE, created_at TEXT NOT NULL, read_at TEXT);
--> statement-breakpoint
CREATE INDEX notifications_user_created_idx ON notifications(user_id,created_at);
--> statement-breakpoint
CREATE TABLE scheduler_runs (id TEXT PRIMARY KEY, started_at TEXT NOT NULL, completed_at TEXT, outcome TEXT NOT NULL CHECK(outcome IN('running','completed','failed')), processed INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE forum_threads (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, body TEXT NOT NULL, subject TEXT NOT NULL, tags_json TEXT NOT NULL, hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN(0,1)), created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX forum_threads_subject_created_idx ON forum_threads(subject,created_at);
--> statement-breakpoint
CREATE TABLE forum_replies (id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES forum_threads(id), user_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN(0,1)), created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX forum_replies_thread_created_idx ON forum_replies(thread_id,created_at);
--> statement-breakpoint
CREATE TABLE forum_votes (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, entity_type TEXT NOT NULL CHECK(entity_type IN('thread','reply')), entity_id TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)), created_at TEXT NOT NULL, PRIMARY KEY(user_id,entity_type,entity_id));
--> statement-breakpoint
CREATE TABLE activity_events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, feature TEXT NOT NULL, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX activity_feature_created_idx ON activity_events(feature,created_at);
--> statement-breakpoint
CREATE TABLE moderation_events (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id), entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, hidden INTEGER NOT NULL, created_at TEXT NOT NULL);
--> statement-breakpoint
