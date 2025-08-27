/*
  Warnings:

  - You are about to drop the `footnote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `words_of_jesus` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "footnote" DROP CONSTRAINT "footnote_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "footnote" DROP CONSTRAINT "footnote_headingId_fkey";

-- DropForeignKey
ALTER TABLE "footnote" DROP CONSTRAINT "footnote_verseId_fkey";

-- DropForeignKey
ALTER TABLE "words_of_jesus" DROP CONSTRAINT "words_of_jesus_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "words_of_jesus" DROP CONSTRAINT "words_of_jesus_verseId_fkey";

-- DropTable
DROP TABLE "footnote";

-- DropTable
DROP TABLE "words_of_jesus";

-- CreateTable
CREATE TABLE "mark" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "kind" TEXT NOT NULL DEFAULT 'footnote',
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "chapterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mark_chapterId_sortOrder_idx" ON "mark"("chapterId", "sortOrder");

-- CreateIndex
CREATE INDEX "mark_chapterId_kind_idx" ON "mark"("chapterId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "mark_sortOrder_targetId_kind_key" ON "mark"("sortOrder", "targetId", "kind");

-- AddForeignKey
ALTER TABLE "mark" ADD CONSTRAINT "mark_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
