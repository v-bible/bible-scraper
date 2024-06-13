-- AlterTable
ALTER TABLE "book_verse" ADD COLUMN     "headingId" TEXT;

-- CreateTable
CREATE TABLE "book_heading" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verseId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,

    CONSTRAINT "book_heading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "book_heading_verseId_key" ON "book_heading"("verseId");

-- AddForeignKey
ALTER TABLE "book_heading" ADD CONSTRAINT "book_heading_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "book_verse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_heading" ADD CONSTRAINT "book_heading_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "book_chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
