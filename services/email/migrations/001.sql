CREATE TABLE subscribers(email TEXT PRIMARY KEY, audiences TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE consent(id INTEGER PRIMARY KEY, email TEXT NOT NULL, audiences TEXT NOT NULL, mode TEXT NOT NULL, source TEXT NOT NULL, policy TEXT NOT NULL, recorded_at TEXT NOT NULL);
CREATE TABLE suppressions(email TEXT NOT NULL, reason TEXT NOT NULL, source TEXT NOT NULL, occurred_at TEXT NOT NULL, PRIMARY KEY(email, reason));
CREATE TABLE events(id TEXT PRIMARY KEY, received_at TEXT NOT NULL);
CREATE TABLE jobs(id TEXT PRIMARY KEY, hash TEXT NOT NULL, status TEXT NOT NULL, result TEXT, created_at TEXT NOT NULL);
CREATE TABLE publications(job_id TEXT PRIMARY KEY, publication_key TEXT NOT NULL);
