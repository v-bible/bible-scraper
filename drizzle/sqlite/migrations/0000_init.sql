CREATE TABLE `book` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`testament` text NOT NULL,
	`book_order` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`version_id` text NOT NULL,
	FOREIGN KEY (`version_id`) REFERENCES `version`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `book_code_version_id_key` ON `book` (`code`,`version_id`);--> statement-breakpoint
CREATE INDEX `book_version_id_book_order_idx` ON `book` (`version_id`,`book_order`);--> statement-breakpoint
CREATE INDEX `book_testament_idx` ON `book` (`testament`);--> statement-breakpoint
CREATE INDEX `book_version_id_testament_idx` ON `book` (`version_id`,`testament`);--> statement-breakpoint
CREATE TABLE `chapter` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`audio_url` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`book_id` text NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chapter_book_id_number_key` ON `chapter` (`book_id`,`number`);--> statement-breakpoint
CREATE TABLE `heading` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`chapter_id` text NOT NULL,
	`verse_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapter`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`verse_id`) REFERENCES `verse`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `heading_sort_order_verse_id_key` ON `heading` (`sort_order`,`verse_id`);--> statement-breakpoint
CREATE INDEX `heading_chapter_id_level_idx` ON `heading` (`chapter_id`,`level`);--> statement-breakpoint
CREATE TABLE `mark` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'FOOTNOTE' NOT NULL,
	`label` text NOT NULL,
	`content` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`start_offset` integer NOT NULL,
	`end_offset` integer NOT NULL,
	`chapter_id` text NOT NULL,
	`target_id` text NOT NULL,
	`target_type` text DEFAULT 'VERSE' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapter`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mark_sort_order_target_id_kind_key` ON `mark` (`sort_order`,`target_id`,`kind`);--> statement-breakpoint
CREATE INDEX `mark_chapter_id_sort_order_idx` ON `mark` (`chapter_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `mark_chapter_id_kind_idx` ON `mark` (`chapter_id`,`kind`);--> statement-breakpoint
CREATE TABLE `psalm_metadata` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`chapter_id` text NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapter`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `psalm_metadata_sort_order_chapter_id_key` ON `psalm_metadata` (`sort_order`,`chapter_id`);--> statement-breakpoint
CREATE TABLE `verse` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`sub_verse_index` integer DEFAULT 0 NOT NULL,
	`text` text NOT NULL,
	`paragraph_number` integer DEFAULT 0 NOT NULL,
	`paragraph_index` integer DEFAULT 0 NOT NULL,
	`is_poetry` integer DEFAULT false NOT NULL,
	`audio_url` text,
	`label` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`chapter_id` text NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapter`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verse_number_sub_verse_index_chapter_id_key` ON `verse` (`number`,`sub_verse_index`,`chapter_id`);--> statement-breakpoint
CREATE INDEX `verse_chapter_id_is_poetry_idx` ON `verse` (`chapter_id`,`is_poetry`);--> statement-breakpoint
CREATE INDEX `verse_chapter_id_paragraph_number_idx` ON `verse` (`chapter_id`,`paragraph_number`);--> statement-breakpoint
CREATE TABLE `version` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`language` text NOT NULL,
	`source` text NOT NULL,
	`format_type` text NOT NULL,
	`source_url` text NOT NULL,
	`has_old_testament` integer DEFAULT true NOT NULL,
	`has_new_testament` integer DEFAULT true NOT NULL,
	`has_apocrypha` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `version_code_language_source_format_type_key` ON `version` (`code`,`language`,`source`,`format_type`);--> statement-breakpoint
CREATE INDEX `version_language_idx` ON `version` (`language`);--> statement-breakpoint
CREATE INDEX `version_source_idx` ON `version` (`source`);--> statement-breakpoint
CREATE INDEX `version_format_type_idx` ON `version` (`format_type`);