/*
  Warnings:

  - You are about to drop the column `url` on the `book_chapter` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `version_format` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[type,ref]` on the table `version_format` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ref` to the `book_chapter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ref` to the `version_format` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "version_format_type_url_key";

-- AlterTable
ALTER TABLE "book_chapter" DROP COLUMN "url",
ADD COLUMN     "ref" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "version_format" DROP COLUMN "url",
ADD COLUMN     "ref" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "version_format_type_ref_key" ON "version_format"("type", "ref");
