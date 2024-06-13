/*
  Warnings:

  - Added the required column `webOrigin` to the `version_language` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "version_language" ADD COLUMN     "webOrigin" TEXT NOT NULL;
