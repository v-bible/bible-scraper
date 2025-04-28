-- Drop the old view if it exists
DROP VIEW IF EXISTS version_languages_view;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_version_language" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT '',
    "webOrigin" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_version_language" ("code", "createdAt", "id", "name", "updatedAt", "webOrigin") SELECT "code", "createdAt", "id", "name", "updatedAt", "webOrigin" FROM "version_language";
DROP TABLE "version_language";
ALTER TABLE "new_version_language" RENAME TO "version_language";
CREATE UNIQUE INDEX "version_language_code_webOrigin_key" ON "version_language"("code", "webOrigin");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Recreate the view
CREATE VIEW version_languages_view AS
SELECT
    "v".*,
    "vl"."origin",
    "vl"."webOrigin",
    "vl"."code" AS "langCode"
FROM version AS "v"
INNER JOIN version_language AS "vl" ON "v"."languageId" = "vl"."id";
