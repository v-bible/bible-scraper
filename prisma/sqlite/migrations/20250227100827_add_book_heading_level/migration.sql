-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_book_heading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verseId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    CONSTRAINT "book_heading_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "book_chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "book_heading_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "book_verse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_book_heading" ("chapterId", "content", "createdAt", "id", "level", "order", "updatedAt", "verseId") SELECT "chapterId", "content", "createdAt", "id", 0 AS "level", "order", "updatedAt", "verseId" FROM "book_heading";
DROP TABLE "book_heading";
ALTER TABLE "new_book_heading" RENAME TO "book_heading";
CREATE UNIQUE INDEX "book_heading_order_verseId_key" ON "book_heading"("order", "verseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
