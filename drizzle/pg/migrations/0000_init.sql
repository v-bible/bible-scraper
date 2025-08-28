CREATE TYPE "public"."mark_kind" AS ENUM('UNSPECIFIED', 'FOOTNOTE', 'REFERENCE', 'WORDS_OF_JESUS');--> statement-breakpoint
CREATE TYPE "public"."mark_target_type" AS ENUM('UNSPECIFIED', 'VERSE', 'HEADING');--> statement-breakpoint
CREATE TABLE "book" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"testament" text NOT NULL,
	"book_order" integer NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"version_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"audio_url" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"book_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heading" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"chapter_id" uuid NOT NULL,
	"verse_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mark" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "mark_kind" DEFAULT 'FOOTNOTE' NOT NULL,
	"label" text NOT NULL,
	"content" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"start_offset" integer NOT NULL,
	"end_offset" integer NOT NULL,
	"chapter_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"target_type" "mark_target_type" DEFAULT 'VERSE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "psalm_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"chapter_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"sub_verse_index" integer DEFAULT 0 NOT NULL,
	"text" text NOT NULL,
	"paragraph_number" integer DEFAULT 0 NOT NULL,
	"paragraph_index" integer DEFAULT 0 NOT NULL,
	"is_poetry" boolean DEFAULT false NOT NULL,
	"audio_url" text,
	"label" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"chapter_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"language" text NOT NULL,
	"source" text NOT NULL,
	"format_type" text NOT NULL,
	"source_url" text NOT NULL,
	"has_old_testament" boolean DEFAULT true NOT NULL,
	"has_new_testament" boolean DEFAULT true NOT NULL,
	"has_apocrypha" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "book" ADD CONSTRAINT "book_version_id_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_book_id_book_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."book"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heading" ADD CONSTRAINT "heading_chapter_id_chapter_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapter"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heading" ADD CONSTRAINT "heading_verse_id_verse_id_fk" FOREIGN KEY ("verse_id") REFERENCES "public"."verse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark" ADD CONSTRAINT "mark_chapter_id_chapter_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapter"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "psalm_metadata" ADD CONSTRAINT "psalm_metadata_chapter_id_chapter_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapter"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse" ADD CONSTRAINT "verse_chapter_id_chapter_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapter"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "book_code_version_id_key" ON "book" USING btree ("code","version_id");--> statement-breakpoint
CREATE INDEX "book_version_id_book_order_idx" ON "book" USING btree ("version_id","book_order");--> statement-breakpoint
CREATE INDEX "book_testament_idx" ON "book" USING btree ("testament");--> statement-breakpoint
CREATE INDEX "book_version_id_testament_idx" ON "book" USING btree ("version_id","testament");--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_book_id_number_key" ON "chapter" USING btree ("book_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "heading_sort_order_verse_id_key" ON "heading" USING btree ("sort_order","verse_id");--> statement-breakpoint
CREATE INDEX "heading_chapter_id_level_idx" ON "heading" USING btree ("chapter_id","level");--> statement-breakpoint
CREATE UNIQUE INDEX "mark_sort_order_target_id_kind_key" ON "mark" USING btree ("sort_order","target_id","kind");--> statement-breakpoint
CREATE INDEX "mark_chapter_id_sort_order_idx" ON "mark" USING btree ("chapter_id","sort_order");--> statement-breakpoint
CREATE INDEX "mark_chapter_id_kind_idx" ON "mark" USING btree ("chapter_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "psalm_metadata_sort_order_chapter_id_key" ON "psalm_metadata" USING btree ("sort_order","chapter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verse_number_sub_verse_index_chapter_id_key" ON "verse" USING btree ("number","sub_verse_index","chapter_id");--> statement-breakpoint
CREATE INDEX "verse_chapter_id_is_poetry_idx" ON "verse" USING btree ("chapter_id","is_poetry");--> statement-breakpoint
CREATE INDEX "verse_chapter_id_paragraph_number_idx" ON "verse" USING btree ("chapter_id","paragraph_number");--> statement-breakpoint
CREATE UNIQUE INDEX "version_code_language_source_format_type_key" ON "version" USING btree ("code","language","source","format_type");--> statement-breakpoint
CREATE INDEX "version_language_idx" ON "version" USING btree ("language");--> statement-breakpoint
CREATE INDEX "version_source_idx" ON "version" USING btree ("source");--> statement-breakpoint
CREATE INDEX "version_format_type_idx" ON "version" USING btree ("format_type");