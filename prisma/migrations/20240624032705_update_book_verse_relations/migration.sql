/*
  Warnings:

  - You are about to drop the column `footnoteId` on the `book_verse` table. All the data in the column will be lost.
  - You are about to drop the column `headingId` on the `book_verse` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[order,verseId]` on the table `book_footnote` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order,verseId]` on the table `book_heading` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order,verseId]` on the table `book_reference` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `order` to the `book_reference` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "book_footnote_verseId_key";

-- DropIndex
DROP INDEX "book_heading_verseId_key";

-- AlterTable
ALTER TABLE "book_reference" ADD COLUMN     "order" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "book_verse" DROP COLUMN "footnoteId",
DROP COLUMN "headingId";

-- CreateIndex
CREATE UNIQUE INDEX "book_footnote_order_verseId_key" ON "book_footnote"("order", "verseId");

-- CreateIndex
CREATE UNIQUE INDEX "book_heading_order_verseId_key" ON "book_heading"("order", "verseId");

-- CreateIndex
CREATE UNIQUE INDEX "book_reference_order_verseId_key" ON "book_reference"("order", "verseId");
