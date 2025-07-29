-- Drop the old view if it exists
DROP VIEW IF EXISTS version_languages_view;

/*
  Warnings:

  - You are about to drop the `book_chapter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `book_footnote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `book_heading` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `book_reference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `book_verse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `version_format` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `version_language` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `canon` on the `book` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `book` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `book` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `psalm_metadata` table. All the data in the column will be lost.
  - You are about to drop the column `languageId` on the `version` table. All the data in the column will be lost.
  - You are about to drop the column `onlyNT` on the `version` table. All the data in the column will be lost.
  - You are about to drop the column `onlyOT` on the `version` table. All the data in the column will be lost.
  - You are about to drop the column `withApocrypha` on the `version` table. All the data in the column will be lost.
  - Added the required column `bookOrder` to the `book` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `book` table without a default value. This is not possible if the table is not empty.
  - Added the required column `testament` to the `book` table without a default value. This is not possible if the table is not empty.
  - Added the required column `text` to the `psalm_metadata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `formatType` to the `version` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language` to the `version` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `version` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceUrl` to the `version` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "book_chapter_number_bookId_key";

-- DropIndex
DROP INDEX "book_footnote_order_headingId_key";

-- DropIndex
DROP INDEX "book_footnote_order_verseId_key";

-- DropIndex
DROP INDEX "book_heading_order_verseId_key";

-- DropIndex
DROP INDEX "book_reference_order_headingId_key";

-- DropIndex
DROP INDEX "book_reference_order_verseId_key";

-- DropIndex
DROP INDEX "book_verse_number_order_chapterId_key";

-- DropIndex
DROP INDEX "version_format_type_ref_key";

-- DropIndex
DROP INDEX "version_language_code_webOrigin_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "book_chapter";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "book_footnote";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "book_heading";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "book_reference";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "book_verse";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "version_format";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "version_language";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "audioUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookId" TEXT NOT NULL,
    CONSTRAINT "chapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "subVerseIndex" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL,
    "paragraphNumber" INTEGER NOT NULL DEFAULT 0,
    "paragraphIndex" INTEGER NOT NULL DEFAULT 0,
    "isPoetry" BOOLEAN NOT NULL DEFAULT false,
    "audioUrl" TEXT,
    "label" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chapterId" TEXT NOT NULL,
    CONSTRAINT "verse_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "footnote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'footnote',
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL,
    "chapterId" TEXT NOT NULL,
    "verseId" TEXT,
    "headingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "footnote_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "footnote_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "verse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "footnote_headingId_fkey" FOREIGN KEY ("headingId") REFERENCES "heading" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "heading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "chapterId" TEXT NOT NULL,
    "verseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "heading_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "heading_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "verse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "testament" TEXT NOT NULL,
    "bookOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versionId" TEXT NOT NULL,
    CONSTRAINT "book_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "version" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_book" ("code", "createdAt", "id", "updatedAt", "versionId") SELECT "code", "createdAt", "id", "updatedAt", "versionId" FROM "book";
DROP TABLE "book";
ALTER TABLE "new_book" RENAME TO "book";
CREATE INDEX "book_versionId_bookOrder_idx" ON "book"("versionId", "bookOrder");
CREATE INDEX "book_testament_idx" ON "book"("testament");
CREATE INDEX "book_versionId_testament_idx" ON "book"("versionId", "testament");
CREATE UNIQUE INDEX "book_code_versionId_key" ON "book"("code", "versionId");
CREATE TABLE "new_psalm_metadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chapterId" TEXT NOT NULL,
    CONSTRAINT "psalm_metadata_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_psalm_metadata" ("chapterId", "createdAt", "id", "updatedAt") SELECT "chapterId", "createdAt", "id", "updatedAt" FROM "psalm_metadata";
DROP TABLE "psalm_metadata";
ALTER TABLE "new_psalm_metadata" RENAME TO "psalm_metadata";
CREATE UNIQUE INDEX "psalm_metadata_sortOrder_chapterId_key" ON "psalm_metadata"("sortOrder", "chapterId");
CREATE TABLE "new_version" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "formatType" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "hasOldTestament" BOOLEAN NOT NULL DEFAULT true,
    "hasNewTestament" BOOLEAN NOT NULL DEFAULT true,
    "hasApocrypha" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_version" ("code", "createdAt", "id", "name", "updatedAt") SELECT "code", "createdAt", "id", "name", "updatedAt" FROM "version";
DROP TABLE "version";
ALTER TABLE "new_version" RENAME TO "version";
CREATE INDEX "version_language_idx" ON "version"("language");
CREATE INDEX "version_source_idx" ON "version"("source");
CREATE INDEX "version_formatType_idx" ON "version"("formatType");
CREATE UNIQUE INDEX "version_code_language_source_formatType_key" ON "version"("code", "language", "source", "formatType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "chapter_bookId_number_key" ON "chapter"("bookId", "number");

-- CreateIndex
CREATE INDEX "verse_chapterId_isPoetry_idx" ON "verse"("chapterId", "isPoetry");

-- CreateIndex
CREATE INDEX "verse_chapterId_paragraphNumber_idx" ON "verse"("chapterId", "paragraphNumber");

-- CreateIndex
CREATE UNIQUE INDEX "verse_number_subVerseIndex_chapterId_key" ON "verse"("number", "subVerseIndex", "chapterId");

-- CreateIndex
CREATE INDEX "footnote_chapterId_sortOrder_idx" ON "footnote"("chapterId", "sortOrder");

-- CreateIndex
CREATE INDEX "footnote_chapterId_type_idx" ON "footnote"("chapterId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "footnote_sortOrder_verseId_type_key" ON "footnote"("sortOrder", "verseId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "footnote_sortOrder_headingId_type_key" ON "footnote"("sortOrder", "headingId", "type");

-- CreateIndex
CREATE INDEX "heading_chapterId_level_idx" ON "heading"("chapterId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "heading_sortOrder_verseId_key" ON "heading"("sortOrder", "verseId");
