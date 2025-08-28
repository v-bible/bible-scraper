import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Enums for Mark table
export const markKindEnum = pgEnum('mark_kind', [
  'UNSPECIFIED',
  'FOOTNOTE',
  'REFERENCE',
  'WORDS_OF_JESUS',
]);

export const markTargetTypeEnum = pgEnum('mark_target_type', [
  'UNSPECIFIED',
  'VERSE',
  'HEADING',
]);

// Version table
export const version = pgTable(
  'version',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    code: text('code').notNull(), // KT2011, ESV, NIV
    name: text('name').notNull(), // Full name
    language: text('language').notNull(), // vi, en, es
    source: text('source').notNull(), // bible.com, biblegateway.com
    formatType: text('format_type').notNull(), // web, pdf, audio, api
    sourceUrl: text('source_url').notNull(), // Original crawl URL
    hasOldTestament: boolean('has_old_testament').notNull().default(true),
    hasNewTestament: boolean('has_new_testament').notNull().default(true),
    hasApocrypha: boolean('has_apocrypha').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('version_code_language_source_format_type_key').on(
      table.code,
      table.language,
      table.source,
      table.formatType,
    ),
    index('version_language_idx').on(table.language),
    index('version_source_idx').on(table.source),
    index('version_format_type_idx').on(table.formatType),
  ],
);

// Book table
export const book = pgTable(
  'book',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    code: text('code').notNull(), // gen, exo, mt, mk
    name: text('name').notNull(), // Genesis, Exodus, Matthew, Mark
    testament: text('testament').notNull(), // ot, nt, apocrypha
    bookOrder: integer('book_order').notNull(), // Starts from 1
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    versionId: uuid('version_id')
      .notNull()
      .references(() => version.id),
  },
  (table) => [
    uniqueIndex('book_code_version_id_key').on(table.code, table.versionId),
    index('book_version_id_book_order_idx').on(
      table.versionId,
      table.bookOrder,
    ),
    index('book_testament_idx').on(table.testament),
    index('book_version_id_testament_idx').on(table.versionId, table.testament),
  ],
);

// Chapter table
export const chapter = pgTable(
  'chapter',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    number: integer('number').notNull(), // Starts from 1
    audioUrl: text('audio_url'),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    bookId: uuid('book_id')
      .notNull()
      .references(() => book.id),
  },
  (table) => [
    uniqueIndex('chapter_book_id_number_key').on(table.bookId, table.number),
  ],
);

// Verse table
export const verse = pgTable(
  'verse',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    number: integer('number').notNull(), // Starts from 1
    subVerseIndex: integer('sub_verse_index').notNull().default(0), // For 1a, 1b verses. Starts from 0
    text: text('text').notNull(),
    paragraphNumber: integer('paragraph_number').notNull().default(0), // Which paragraph this verse belongs to. Starts from 0
    paragraphIndex: integer('paragraph_index').notNull().default(0), // Index within the paragraph. Starts from 0
    isPoetry: boolean('is_poetry').notNull().default(false),
    audioUrl: text('audio_url'),
    label: text('label').notNull(), // Verse labels like "1a", "1b", "1c"
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => chapter.id),
  },
  (table) => [
    uniqueIndex('verse_number_sub_verse_index_chapter_id_key').on(
      table.number,
      table.subVerseIndex,
      table.chapterId,
    ),
    index('verse_chapter_id_is_poetry_idx').on(table.chapterId, table.isPoetry),
    index('verse_chapter_id_paragraph_number_idx').on(
      table.chapterId,
      table.paragraphNumber,
    ),
  ],
);

// Mark table (replaces Footnote and WordsOfJesus)
export const mark = pgTable(
  'mark',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    kind: markKindEnum('kind').notNull().default('FOOTNOTE'), // footnote, cross-reference, words-of-jesus
    label: text('label').notNull(), // a, b, c, 1, 2, 3, *
    content: text('content').notNull(),
    sortOrder: integer('sort_order').notNull().default(0), // Starts from 0
    startOffset: integer('start_offset').notNull(), // Starts from 0
    endOffset: integer('end_offset').notNull(), // Exclusive end
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => chapter.id),
    targetId: uuid('target_id').notNull(), // Attached to specific verse
    targetType: markTargetTypeEnum('target_type').notNull().default('VERSE'), // "verse" or "heading"
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('mark_sort_order_target_id_kind_key').on(
      table.sortOrder,
      table.targetId,
      table.kind,
    ),
    index('mark_chapter_id_sort_order_idx').on(
      table.chapterId,
      table.sortOrder,
    ),
    index('mark_chapter_id_kind_idx').on(table.chapterId, table.kind),
  ],
);

// Heading table
export const heading = pgTable(
  'heading',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    text: text('text').notNull(),
    level: integer('level').notNull().default(1), // Heading level (1, 2, 3...). Starts from 1
    sortOrder: integer('sort_order').notNull().default(0), // Position within chapter. Starts from 0
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => chapter.id),
    verseId: uuid('verse_id')
      .notNull()
      .references(() => verse.id), // Required: attached to specific verse
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('heading_sort_order_verse_id_key').on(
      table.sortOrder,
      table.verseId,
    ),
    index('heading_chapter_id_level_idx').on(table.chapterId, table.level),
  ],
);

// PsalmMetadata table
export const psalmMetadata = pgTable(
  'psalm_metadata',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    text: text('text').notNull(),
    sortOrder: integer('sort_order').notNull().default(0), // Starts from 0
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => chapter.id),
  },
  (table) => [
    uniqueIndex('psalm_metadata_sort_order_chapter_id_key').on(
      table.sortOrder,
      table.chapterId,
    ),
  ],
);

// Relations
export const versionRelations = relations(version, ({ many }) => ({
  books: many(book),
}));

export const bookRelations = relations(book, ({ one, many }) => ({
  version: one(version, {
    fields: [book.versionId],
    references: [version.id],
  }),
  chapters: many(chapter),
}));

export const chapterRelations = relations(chapter, ({ one, many }) => ({
  book: one(book, {
    fields: [chapter.bookId],
    references: [book.id],
  }),
  verses: many(verse),
  marks: many(mark),
  headings: many(heading),
  psalmMetadata: many(psalmMetadata),
}));

export const verseRelations = relations(verse, ({ one, many }) => ({
  chapter: one(chapter, {
    fields: [verse.chapterId],
    references: [chapter.id],
  }),
  headings: many(heading),
}));

export const markRelations = relations(mark, ({ one }) => ({
  chapter: one(chapter, {
    fields: [mark.chapterId],
    references: [chapter.id],
  }),
}));

export const headingRelations = relations(heading, ({ one }) => ({
  chapter: one(chapter, {
    fields: [heading.chapterId],
    references: [chapter.id],
  }),
  verse: one(verse, {
    fields: [heading.verseId],
    references: [verse.id],
  }),
}));

export const psalmMetadataRelations = relations(psalmMetadata, ({ one }) => ({
  chapter: one(chapter, {
    fields: [psalmMetadata.chapterId],
    references: [chapter.id],
  }),
}));

// Type exports for use in application code
export type Version = typeof version.$inferSelect;
export type NewVersion = typeof version.$inferInsert;

export type Book = typeof book.$inferSelect;
export type NewBook = typeof book.$inferInsert;

export type Chapter = typeof chapter.$inferSelect;
export type NewChapter = typeof chapter.$inferInsert;

export type Verse = typeof verse.$inferSelect;
export type NewVerse = typeof verse.$inferInsert;

export type Mark = typeof mark.$inferSelect;
export type NewMark = typeof mark.$inferInsert;

export type Heading = typeof heading.$inferSelect;
export type NewHeading = typeof heading.$inferInsert;

export type PsalmMetadata = typeof psalmMetadata.$inferSelect;
export type NewPsalmMetadata = typeof psalmMetadata.$inferInsert;
