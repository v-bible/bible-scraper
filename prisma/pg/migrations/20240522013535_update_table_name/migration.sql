/*
  Warnings:

  - You are about to drop the `Book` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BookChapter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BookVerse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Version` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VersionFormat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VersionLanguage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Book" DROP CONSTRAINT "Book_versionId_fkey";

-- DropForeignKey
ALTER TABLE "BookChapter" DROP CONSTRAINT "BookChapter_bookId_fkey";

-- DropForeignKey
ALTER TABLE "BookVerse" DROP CONSTRAINT "BookVerse_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "Version" DROP CONSTRAINT "Version_languageId_fkey";

-- DropForeignKey
ALTER TABLE "VersionFormat" DROP CONSTRAINT "VersionFormat_versionId_fkey";

-- DropTable
DROP TABLE "Book";

-- DropTable
DROP TABLE "BookChapter";

-- DropTable
DROP TABLE "BookVerse";

-- DropTable
DROP TABLE "Version";

-- DropTable
DROP TABLE "VersionFormat";

-- DropTable
DROP TABLE "VersionLanguage";

-- CreateTable
CREATE TABLE "version" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "onlyNT" BOOLEAN NOT NULL DEFAULT false,
    "onlyOT" BOOLEAN NOT NULL DEFAULT false,
    "withApocrypha" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "languageId" TEXT NOT NULL,

    CONSTRAINT "version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_format" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "versionId" TEXT NOT NULL,

    CONSTRAINT "version_format_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_language" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "version_language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "versionId" TEXT NOT NULL,

    CONSTRAINT "book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_chapter" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bookId" TEXT NOT NULL,

    CONSTRAINT "book_chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_verse" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "parNum" INTEGER NOT NULL,
    "parIdx" INTEGER NOT NULL,
    "isPoetry" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "chapterId" TEXT NOT NULL,

    CONSTRAINT "book_verse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "version_code_key" ON "version"("code");

-- CreateIndex
CREATE UNIQUE INDEX "version_format_type_url_key" ON "version_format"("type", "url");

-- CreateIndex
CREATE UNIQUE INDEX "version_language_code_key" ON "version_language"("code");

-- CreateIndex
CREATE UNIQUE INDEX "book_code_key" ON "book"("code");

-- CreateIndex
CREATE UNIQUE INDEX "book_chapter_number_bookId_key" ON "book_chapter"("number", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "book_verse_number_chapterId_order_key" ON "book_verse"("number", "chapterId", "order");

-- AddForeignKey
ALTER TABLE "version" ADD CONSTRAINT "version_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "version_language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_format" ADD CONSTRAINT "version_format_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book" ADD CONSTRAINT "book_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_chapter" ADD CONSTRAINT "book_chapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_verse" ADD CONSTRAINT "book_verse_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "book_chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
