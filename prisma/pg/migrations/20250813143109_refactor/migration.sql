-- Drop the old view if it exists
DROP VIEW IF EXISTS version_languages_view;

/*
  Warnings:

  - You are about to drop the column `canon` on the `book` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `book` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `book` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `psalm_metadata` table. All the data in the column will be lost.
  - You are about to drop the column `languageId` on the `version` table. All the data in the column will be lost.
  - You are about to drop the column `onlyNT` on the `version` table. All the data in the column will be lost.
  - You are about to drop the column `onlyOT` on the `version` table. All the data in the column will be lost.
  - You are about to drop the column `withApocrypha` on the `version` table. All the data in the column will be lost.
  - You are about to drop the `book_chapter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `book_footnote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `book_heading` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `book_reference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `book_verse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `version_format` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `version_language` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[sortOrder,chapterId]` on the table `psalm_metadata` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code,language,source,formatType]` on the table `version` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bookOrder` to the `book` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `book` table without a default value. This is not possible if the table is not empty.
  - Added the required column `testament` to the `book` table without a default value. This is not possible if the table is not empty.
  - Added the required column `text` to the `psalm_metadata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `formatType` to the `version` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language` to the `version` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `version` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceUrl` to the `version` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "book_chapter" DROP CONSTRAINT "book_chapter_bookId_fkey";

-- DropForeignKey
ALTER TABLE "book_footnote" DROP CONSTRAINT "book_footnote_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "book_footnote" DROP CONSTRAINT "book_footnote_headingId_fkey";

-- DropForeignKey
ALTER TABLE "book_footnote" DROP CONSTRAINT "book_footnote_verseId_fkey";

-- DropForeignKey
ALTER TABLE "book_heading" DROP CONSTRAINT "book_heading_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "book_heading" DROP CONSTRAINT "book_heading_verseId_fkey";

-- DropForeignKey
ALTER TABLE "book_reference" DROP CONSTRAINT "book_reference_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "book_reference" DROP CONSTRAINT "book_reference_headingId_fkey";

-- DropForeignKey
ALTER TABLE "book_reference" DROP CONSTRAINT "book_reference_verseId_fkey";

-- DropForeignKey
ALTER TABLE "book_verse" DROP CONSTRAINT "book_verse_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "psalm_metadata" DROP CONSTRAINT "psalm_metadata_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "version" DROP CONSTRAINT "version_languageId_fkey";

-- DropForeignKey
ALTER TABLE "version_format" DROP CONSTRAINT "version_format_versionId_fkey";

-- DropIndex
DROP INDEX "psalm_metadata_chapterId_key";

-- DropIndex
DROP INDEX "version_code_languageId_key";

-- AlterTable
ALTER TABLE "book" DROP COLUMN "canon",
DROP COLUMN "order",
DROP COLUMN "title",
ADD COLUMN     "bookOrder" INTEGER NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "testament" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "psalm_metadata" DROP COLUMN "title",
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "text" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "version" DROP COLUMN "languageId",
DROP COLUMN "onlyNT",
DROP COLUMN "onlyOT",
DROP COLUMN "withApocrypha",
ADD COLUMN     "formatType" TEXT NOT NULL,
ADD COLUMN     "hasApocrypha" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasNewTestament" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hasOldTestament" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "language" TEXT NOT NULL,
ADD COLUMN     "source" TEXT NOT NULL,
ADD COLUMN     "sourceUrl" TEXT NOT NULL;

-- DropTable
DROP TABLE "book_chapter";

-- DropTable
DROP TABLE "book_footnote";

-- DropTable
DROP TABLE "book_heading";

-- DropTable
DROP TABLE "book_reference";

-- DropTable
DROP TABLE "book_verse";

-- DropTable
DROP TABLE "version_format";

-- DropTable
DROP TABLE "version_language";

-- CreateTable
CREATE TABLE "chapter" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "number" INTEGER NOT NULL,
    "audioUrl" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookId" TEXT NOT NULL,

    CONSTRAINT "chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verse" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "number" INTEGER NOT NULL,
    "subVerseIndex" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL,
    "paragraphNumber" INTEGER NOT NULL DEFAULT 0,
    "paragraphIndex" INTEGER NOT NULL DEFAULT 0,
    "isPoetry" BOOLEAN NOT NULL DEFAULT false,
    "audioUrl" TEXT,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chapterId" TEXT NOT NULL,

    CONSTRAINT "verse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "footnote" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL DEFAULT 'footnote',
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL,
    "chapterId" TEXT NOT NULL,
    "verseId" TEXT,
    "headingId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "footnote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "heading" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "text" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "chapterId" TEXT NOT NULL,
    "verseId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "heading_pkey" PRIMARY KEY ("id")
);

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

-- CreateIndex
CREATE INDEX "book_versionId_bookOrder_idx" ON "book"("versionId", "bookOrder");

-- CreateIndex
CREATE INDEX "book_testament_idx" ON "book"("testament");

-- CreateIndex
CREATE INDEX "book_versionId_testament_idx" ON "book"("versionId", "testament");

-- CreateIndex
CREATE UNIQUE INDEX "psalm_metadata_sortOrder_chapterId_key" ON "psalm_metadata"("sortOrder", "chapterId");

-- CreateIndex
CREATE INDEX "version_language_idx" ON "version"("language");

-- CreateIndex
CREATE INDEX "version_source_idx" ON "version"("source");

-- CreateIndex
CREATE INDEX "version_formatType_idx" ON "version"("formatType");

-- CreateIndex
CREATE UNIQUE INDEX "version_code_language_source_formatType_key" ON "version"("code", "language", "source", "formatType");

-- AddForeignKey
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verse" ADD CONSTRAINT "verse_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "footnote" ADD CONSTRAINT "footnote_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "footnote" ADD CONSTRAINT "footnote_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "verse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "footnote" ADD CONSTRAINT "footnote_headingId_fkey" FOREIGN KEY ("headingId") REFERENCES "heading"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heading" ADD CONSTRAINT "heading_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heading" ADD CONSTRAINT "heading_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "verse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psalm_metadata" ADD CONSTRAINT "psalm_metadata_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
