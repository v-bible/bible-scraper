-- CreateTable
CREATE TABLE "psalm_metadata" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chapterId" TEXT NOT NULL,

    CONSTRAINT "psalm_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "psalm_metadata_chapterId_key" ON "psalm_metadata"("chapterId");

-- AddForeignKey
ALTER TABLE "psalm_metadata" ADD CONSTRAINT "psalm_metadata_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "book_chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
