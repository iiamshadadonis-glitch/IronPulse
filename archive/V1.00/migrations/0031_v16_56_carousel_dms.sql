-- V16.56: carousel media metadata + unified Social Media DMs.
ALTER TABLE social_posts ADD COLUMN media_items_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS social_dm_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  external_conversation_id TEXT NOT NULL,
  participant_id TEXT NOT NULL DEFAULT '',
  participant_name TEXT NOT NULL DEFAULT '',
  participant_username TEXT NOT NULL DEFAULT '',
  participant_profile_url TEXT NOT NULL DEFAULT '',
  participant_avatar_url TEXT NOT NULL DEFAULT '',
  folder TEXT NOT NULL DEFAULT 'inbox',
  last_message_text TEXT NOT NULL DEFAULT '',
  last_message_at TEXT NOT NULL DEFAULT '',
  unread_count INTEGER NOT NULL DEFAULT 0,
  raw_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, external_conversation_id)
);

CREATE TABLE IF NOT EXISTS social_dm_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  external_message_id TEXT NOT NULL,
  sender_id TEXT NOT NULL DEFAULT '',
  sender_name TEXT NOT NULL DEFAULT '',
  direction TEXT NOT NULL DEFAULT 'inbound',
  message_text TEXT NOT NULL DEFAULT '',
  attachment_url TEXT NOT NULL DEFAULT '',
  attachment_type TEXT NOT NULL DEFAULT '',
  sent_at TEXT NOT NULL DEFAULT '',
  raw_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, external_message_id),
  FOREIGN KEY(conversation_id) REFERENCES social_dm_conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_social_dm_conversations_activity ON social_dm_conversations(last_message_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_social_dm_conversations_unread ON social_dm_conversations(unread_count, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_dm_messages_conversation ON social_dm_messages(conversation_id, sent_at, id);
