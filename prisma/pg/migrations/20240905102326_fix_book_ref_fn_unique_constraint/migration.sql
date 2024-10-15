/*
  Warnings:

  - A unique constraint covering the columns `[order,headingId]` on the table `book_footnote` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order,headingId]` on the table `book_reference` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "book_footnote_order_headingId_key" ON "book_footnote"("order", "headingId");

-- CreateIndex
CREATE UNIQUE INDEX "book_reference_order_headingId_key" ON "book_reference"("order", "headingId");

-- AlterTable
ALTER TABLE "book_footnote" DROP CONSTRAINT "check_reference_not_null";

ALTER TABLE "book_footnote" ADD CONSTRAINT "check_reference_not_null_xor" CHECK (
    ("verseId" IS NOT NULL AND "headingId" IS NULL) OR
    ("verseId" IS NULL AND "headingId" IS NOT NULL)
);

-- AlterTable
ALTER TABLE "book_reference" DROP CONSTRAINT "check_reference_not_null";

ALTER TABLE "book_reference" ADD CONSTRAINT "check_reference_not_null_xor" CHECK (
    ("verseId" IS NOT NULL AND "headingId" IS NULL) OR
    ("verseId" IS NULL AND "headingId" IS NOT NULL)
);

