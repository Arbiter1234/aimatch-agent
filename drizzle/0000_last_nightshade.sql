CREATE TABLE `knowledge_chunks` (
	`owner` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`title` text NOT NULL,
	`source` text NOT NULL,
	`content` text NOT NULL,
	`vector` text NOT NULL,
	`model` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_knowledge_owner_document` ON `knowledge_chunks` (`owner`,`document_id`);--> statement-breakpoint
CREATE TABLE `memories` (
	`owner` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`content` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_memories_owner_kind` ON `memories` (`owner`,`kind`,`updated_at`);