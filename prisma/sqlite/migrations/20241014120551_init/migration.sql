-- CreateTable
CREATE TABLE "version" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "onlyNT" BOOLEAN NOT NULL DEFAULT false,
    "onlyOT" BOOLEAN NOT NULL DEFAULT false,
    "withApocrypha" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "languageId" TEXT NOT NULL,
    CONSTRAINT "version_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "version_language" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "version_format" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versionId" TEXT NOT NULL,
    CONSTRAINT "version_format_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "version" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "version_language" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "webOrigin" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "canon" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versionId" TEXT NOT NULL,
    CONSTRAINT "book_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "version" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "ref" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookId" TEXT NOT NULL,
    CONSTRAINT "book_chapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_verse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "parNumber" INTEGER NOT NULL,
    "parIndex" INTEGER NOT NULL,
    "isPoetry" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chapterId" TEXT NOT NULL,
    CONSTRAINT "book_verse_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "book_chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_footnote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verseId" TEXT,
    "headingId" TEXT,
    "chapterId" TEXT NOT NULL,
    CONSTRAINT "book_footnote_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "book_chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "book_footnote_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "book_verse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "book_footnote_headingId_fkey" FOREIGN KEY ("headingId") REFERENCES "book_heading" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_heading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verseId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    CONSTRAINT "book_heading_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "book_chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "book_heading_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "book_verse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_reference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verseId" TEXT,
    "headingId" TEXT,
    "chapterId" TEXT NOT NULL,
    CONSTRAINT "book_reference_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "book_chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "book_reference_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "book_verse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "book_reference_headingId_fkey" FOREIGN KEY ("headingId") REFERENCES "book_heading" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "psalm_metadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chapterId" TEXT NOT NULL,
    CONSTRAINT "psalm_metadata_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "book_chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "schema_migrations" (
    "version" BIGINT NOT NULL PRIMARY KEY,
    "dirty" BOOLEAN NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "version_code_languageId_key" ON "version"("code", "languageId");

-- CreateIndex
CREATE UNIQUE INDEX "version_format_type_ref_key" ON "version_format"("type", "ref");

-- CreateIndex
CREATE UNIQUE INDEX "version_language_code_webOrigin_key" ON "version_language"("code", "webOrigin");

-- CreateIndex
CREATE UNIQUE INDEX "book_code_versionId_key" ON "book"("code", "versionId");

-- CreateIndex
CREATE UNIQUE INDEX "book_chapter_number_bookId_key" ON "book_chapter"("number", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "book_verse_number_order_chapterId_key" ON "book_verse"("number", "order", "chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "book_footnote_order_verseId_key" ON "book_footnote"("order", "verseId");

-- CreateIndex
CREATE UNIQUE INDEX "book_footnote_order_headingId_key" ON "book_footnote"("order", "headingId");

-- CreateIndex
CREATE UNIQUE INDEX "book_heading_order_verseId_key" ON "book_heading"("order", "verseId");

-- CreateIndex
CREATE UNIQUE INDEX "book_reference_order_verseId_key" ON "book_reference"("order", "verseId");

-- CreateIndex
CREATE UNIQUE INDEX "book_reference_order_headingId_key" ON "book_reference"("order", "headingId");

-- CreateIndex
CREATE UNIQUE INDEX "psalm_metadata_chapterId_key" ON "psalm_metadata"("chapterId");
