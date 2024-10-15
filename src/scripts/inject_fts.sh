#!/bin/bash

# Configuration
SOURCE_DB="../../dumps/ktcgkpv_sqlite.db"
TARGET_DB="../../dumps/ktcgkpv_sqlite_fts.db"
FTS_TABLE="content_fts"

# Step 1: Create the FTS table in the target database if it doesn't exist
sqlite3 $TARGET_DB <<EOF
CREATE VIRTUAL TABLE IF NOT EXISTS $FTS_TABLE USING fts5("content", "order", "bookCode", "bookTitle", "bookCanon", "chapNumber", "type");
EOF

# Step 2: Attach the source database and copy data into the FTS table
sqlite3 $TARGET_DB <<EOF
ATTACH '$SOURCE_DB' AS src_db;

-- Insert data from the source database into the FTS table
INSERT INTO $FTS_TABLE("content", "order", "bookCode", "bookTitle", "bookCanon", "chapNumber", "type")
SELECT bv."content", bv."order", b.code AS "bookCode", b.title AS "bookTitle", b.canon AS "bookCanon", bc."number" AS "chapNumber", 'verse' AS "type"
FROM book_verse bv
JOIN book_chapter bc ON bv."chapterId" = bc."id"
JOIN book b ON bc."bookId" = b."id";

INSERT INTO $FTS_TABLE("content", "order", "bookCode", "bookTitle", "bookCanon", "chapNumber", "type")
select bf."content", bf."order", b.code as "bookCode", b.title as "bookTitle", b.canon as "bookCanon", bc."number" as "chapNumber", 'footnote' as "type"
from book_footnote bf
join book_chapter bc on bf."chapterId" = bc.id
join book b on bc."bookId" = b.id;

INSERT INTO $FTS_TABLE("content", "order", "bookCode", "bookTitle", "bookCanon", "chapNumber", "type")
select br."content", br."order", b.code as "bookCode", b.title as "bookTitle", b.canon as "bookCanon", bc."number" as "chapNumber", 'reference' as "type"
from book_reference br
join book_chapter bc on br."chapterId" = bc.id
join book b on bc."bookId" = b.id;

INSERT INTO $FTS_TABLE("content", "order", "bookCode", "bookTitle", "bookCanon", "chapNumber", "type")
select bh."content", bh."order", b.code as "bookCode", b.title as "bookTitle", b.canon as "bookCanon", bc."number" as "chapNumber", 'heading' as "type"
from book_heading bh
join book_chapter bc on bh."chapterId" = bc.id
join book b on bc."bookId" = b.id;

DETACH DATABASE src_db;
EOF

echo "Data successfully injected from $SOURCE_DB into the FTS table in $TARGET_DB."
