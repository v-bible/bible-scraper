-- DropForeignKey
ALTER TABLE "book_footnote" DROP CONSTRAINT "book_footnote_verseId_fkey";

-- DropForeignKey
ALTER TABLE "book_reference" DROP CONSTRAINT "book_reference_verseId_fkey";

-- AlterTable
ALTER TABLE "book_footnote" ADD COLUMN     "headingId" TEXT,
ALTER COLUMN "verseId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "book_reference" ADD COLUMN     "headingId" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "verseId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "book_footnote" ADD CONSTRAINT "book_footnote_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "book_verse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_footnote" ADD CONSTRAINT "book_footnote_headingId_fkey" FOREIGN KEY ("headingId") REFERENCES "book_heading"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_reference" ADD CONSTRAINT "book_reference_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "book_verse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_reference" ADD CONSTRAINT "book_reference_headingId_fkey" FOREIGN KEY ("headingId") REFERENCES "book_heading"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "book_footnote" ADD CONSTRAINT "check_reference_not_null" CHECK (
    ("verseId" IS NOT NULL) OR
    ("headingId" IS NOT NULL)
);

ALTER TABLE "book_reference" ADD CONSTRAINT "check_reference_not_null" CHECK (
    ("verseId" IS NOT NULL) OR
    ("headingId" IS NOT NULL)
);
