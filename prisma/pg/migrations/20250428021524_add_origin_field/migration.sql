-- Drop the old view if it exists
DROP VIEW IF EXISTS version_languages_view;

-- AlterTable
ALTER TABLE "version_language" ADD COLUMN     "origin" TEXT NOT NULL DEFAULT '';

-- Recreate the view
CREATE VIEW version_languages_view AS
SELECT
    "v".*,
    "vl"."origin",
    "vl"."webOrigin",
    "vl"."code" AS "langCode"
FROM version AS "v"
INNER JOIN version_language AS "vl" ON "v"."languageId" = "vl"."id";
