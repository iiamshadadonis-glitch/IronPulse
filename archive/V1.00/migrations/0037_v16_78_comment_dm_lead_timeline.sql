-- V16.78: deterministic public-comment variation rotation.
-- Rich message, delay, offer and lead-timeline settings remain in the existing
-- JSON flow definitions, so no attachment bytes or duplicate schedule tables
-- are introduced.
CREATE TABLE IF NOT EXISTS social_automation_round_robin (
  flow_id INTEGER NOT NULL,
  node_id TEXT NOT NULL,
  cursor INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(flow_id, node_id)
);
