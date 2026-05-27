CREATE TABLE IF NOT EXISTS `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text DEFAULT 'New chat' NOT NULL,
  `model` text,
  `system_prompt` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `archived` integer DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS `messages` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL,
  `role` text NOT NULL,
  `content` text DEFAULT '' NOT NULL,
  `attachments_json` text,
  `tokens_in` integer,
  `tokens_out` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `images` (
  `id` text PRIMARY KEY NOT NULL,
  `prompt` text NOT NULL,
  `negative_prompt` text,
  `model` text,
  `params_json` text,
  `url` text NOT NULL,
  `thumbnail_url` text,
  `session_id` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE set null
);

CREATE TABLE IF NOT EXISTS `videos` (
  `id` text PRIMARY KEY NOT NULL,
  `prompt` text NOT NULL,
  `params_json` text,
  `url` text NOT NULL,
  `thumbnail_url` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE TABLE IF NOT EXISTS `documents` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `source_uri` text NOT NULL,
  `mime` text,
  `byte_size` integer,
  `ingested_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE TABLE IF NOT EXISTS `chunks` (
  `id` text PRIMARY KEY NOT NULL,
  `document_id` text NOT NULL,
  `content` text NOT NULL,
  `embedding_blob` blob,
  `page` integer,
  `position` integer,
  FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `agents` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `graph_json` text DEFAULT '{}' NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE TABLE IF NOT EXISTS `agent_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `agent_id` text NOT NULL,
  `input` text NOT NULL,
  `output` text,
  `trace_json` text,
  `status` text DEFAULT 'pending' NOT NULL,
  `started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `ended_at` integer,
  FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `settings` (
  `key` text PRIMARY KEY NOT NULL,
  `value_json` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `skills` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `body` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
