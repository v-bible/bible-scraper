/*
  Warnings:

  - The `kind` column on the `mark` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `targetType` on the `mark` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "MarkKind" AS ENUM ('UNSPECIFIED', 'FOOTNOTE', 'REFERENCE', 'WORDS_OF_JESUS');

-- CreateEnum
CREATE TYPE "MarkTargetType" AS ENUM ('UNSPECIFIED', 'VERSE', 'HEADING');

-- AlterTable
ALTER TABLE "mark" DROP COLUMN "kind",
ADD COLUMN     "kind" "MarkKind" NOT NULL DEFAULT 'FOOTNOTE',
DROP COLUMN "targetType",
ADD COLUMN     "targetType" "MarkTargetType" NOT NULL;

-- CreateIndex
CREATE INDEX "mark_chapterId_kind_idx" ON "mark"("chapterId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "mark_sortOrder_targetId_kind_key" ON "mark"("sortOrder", "targetId", "kind");
