/*
  Warnings:

  - You are about to drop the column `type` on the `book` table. All the data in the column will be lost.
  - You are about to drop the column `parIdx` on the `book_verse` table. All the data in the column will be lost.
  - You are about to drop the column `parNum` on the `book_verse` table. All the data in the column will be lost.
  - Added the required column `canon` to the `book` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parIndex` to the `book_verse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parNumber` to the `book_verse` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "book" DROP COLUMN "type",
ADD COLUMN     "canon" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "book_verse" DROP COLUMN "parIdx",
DROP COLUMN "parNum",
ADD COLUMN     "parIndex" INTEGER NOT NULL,
ADD COLUMN     "parNumber" INTEGER NOT NULL;
