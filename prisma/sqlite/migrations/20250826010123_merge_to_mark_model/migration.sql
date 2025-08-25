/*
  Warnings:

  - You are about to drop the `footnote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `words_of_jesus` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "footnote";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "words_of_jesus";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "mark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'footnote',
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "chapterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mark_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "mark_chapterId_sortOrder_idx" ON "mark"("chapterId", "sortOrder");

-- CreateIndex
CREATE INDEX "mark_chapterId_kind_idx" ON "mark"("chapterId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "mark_sortOrder_targetId_kind_key" ON "mark"("sortOrder", "targetId", "kind");
