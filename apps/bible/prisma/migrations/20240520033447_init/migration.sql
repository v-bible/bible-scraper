-- CreateTable
CREATE TABLE "Version" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "onlyNT" BOOLEAN NOT NULL DEFAULT false,
    "onlyOT" BOOLEAN NOT NULL DEFAULT false,
    "withApocrypha" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "languageId" TEXT NOT NULL,

    CONSTRAINT "Version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionFormat" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "versionId" TEXT NOT NULL,

    CONSTRAINT "VersionFormat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionLanguage" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VersionLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "versionId" TEXT NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookChapter" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bookId" TEXT NOT NULL,

    CONSTRAINT "BookChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookVerse" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "parNum" INTEGER NOT NULL,
    "parIdx" INTEGER NOT NULL,
    "isPoetry" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "chapterId" TEXT NOT NULL,

    CONSTRAINT "BookVerse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Version_code_key" ON "Version"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VersionFormat_type_url_key" ON "VersionFormat"("type", "url");

-- CreateIndex
CREATE UNIQUE INDEX "VersionLanguage_code_key" ON "VersionLanguage"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Book_code_key" ON "Book"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BookChapter_number_bookId_key" ON "BookChapter"("number", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "BookVerse_number_chapterId_order_key" ON "BookVerse"("number", "chapterId", "order");

-- AddForeignKey
ALTER TABLE "Version" ADD CONSTRAINT "Version_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "VersionLanguage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionFormat" ADD CONSTRAINT "VersionFormat_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookChapter" ADD CONSTRAINT "BookChapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookVerse" ADD CONSTRAINT "BookVerse_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
