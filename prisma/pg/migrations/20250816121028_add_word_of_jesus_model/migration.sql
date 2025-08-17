-- CreateTable
CREATE TABLE "words_of_jesus" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "textStart" INTEGER NOT NULL,
    "textEnd" INTEGER NOT NULL,
    "quotationText" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chapterId" TEXT NOT NULL,
    "verseId" TEXT NOT NULL,

    CONSTRAINT "words_of_jesus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "words_of_jesus_sortOrder_verseId_key" ON "words_of_jesus"("sortOrder", "verseId");

-- AddForeignKey
ALTER TABLE "words_of_jesus" ADD CONSTRAINT "words_of_jesus_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "verse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "words_of_jesus" ADD CONSTRAINT "words_of_jesus_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
