-- CreateView
CREATE VIEW version_languages_view AS
SELECT
    "v".*,
    "vl"."webOrigin",
    "vl"."code" AS "langCode"
FROM version AS "v"
INNER JOIN version_language AS "vl" ON "v"."languageId" = "vl"."id";
