-- AlterTable
ALTER TABLE "book_verse" ADD COLUMN     "footnoteId" TEXT;

-- CreateTable
CREATE TABLE "book_footnote" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verseId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,

    CONSTRAINT "book_footnote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "book_footnote_verseId_key" ON "book_footnote"("verseId");

-- AddForeignKey
ALTER TABLE "book_footnote" ADD CONSTRAINT "book_footnote_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "book_verse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_footnote" ADD CONSTRAINT "book_footnote_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "book_chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
