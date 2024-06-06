/*
  Warnings:

  - A unique constraint covering the columns `[code,versionId]` on the table `book` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[number,order,chapterId]` on the table `book_verse` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code,languageId]` on the table `version` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code,webOrigin]` on the table `version_language` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "book_code_key";

-- DropIndex
DROP INDEX "book_verse_number_chapterId_order_key";

-- DropIndex
DROP INDEX "version_code_key";

-- DropIndex
DROP INDEX "version_language_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "book_code_versionId_key" ON "book"("code", "versionId");

-- CreateIndex
CREATE UNIQUE INDEX "book_verse_number_order_chapterId_key" ON "book_verse"("number", "order", "chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "version_code_languageId_key" ON "version"("code", "languageId");

-- CreateIndex
CREATE UNIQUE INDEX "version_language_code_webOrigin_key" ON "version_language"("code", "webOrigin");
