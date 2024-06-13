-- CreateTable
CREATE TABLE "book_reference" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verseId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,

    CONSTRAINT "book_reference_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "book_reference" ADD CONSTRAINT "book_reference_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "book_verse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_reference" ADD CONSTRAINT "book_reference_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "book_chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
