-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_mark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'FOOTNOTE',
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
INSERT INTO "new_mark" ("chapterId", "content", "createdAt", "endOffset", "id", "kind", "label", "sortOrder", "startOffset", "targetId", "targetType", "updatedAt") SELECT "chapterId", "content", "createdAt", "endOffset", "id", "kind", "label", "sortOrder", "startOffset", "targetId", "targetType", "updatedAt" FROM "mark";
DROP TABLE "mark";
ALTER TABLE "new_mark" RENAME TO "mark";
CREATE INDEX "mark_chapterId_sortOrder_idx" ON "mark"("chapterId", "sortOrder");
CREATE INDEX "mark_chapterId_kind_idx" ON "mark"("chapterId", "kind");
CREATE UNIQUE INDEX "mark_sortOrder_targetId_kind_key" ON "mark"("sortOrder", "targetId", "kind");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
