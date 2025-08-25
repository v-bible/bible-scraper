import fs from 'fs/promises';
import Database from 'better-sqlite3';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

// FTS record type for the virtual table
export type FTSRecord = {
  objectId: string;
  content: string;
  sortOrder: number;
  bookCode: string;
  bookName: string;
  testament: string;
  chapterNumber: number;
  chapterId: string;
  verseNumber?: number; // For content attached to specific verses
  type: 'verse' | 'mark' | 'heading' | 'psalm_metadata';
  subType?: string; // For marks: 'footnote' | 'cross_reference'
};

async function setupDatabase(targetDbPath: string): Promise<Database.Database> {
  // Check if target database exists, if not create it
  try {
    await fs.access(targetDbPath);
    logger.info(`Target database already exists: ${targetDbPath}`);
  } catch {
    // Create empty database file
    const targetDb = new Database(targetDbPath);
    targetDb.close();
    logger.info(`Created new target database: ${targetDbPath}`);
  }

  // Open database connection
  const targetDb = new Database(targetDbPath);
  logger.info(`Database connection established`);
  return targetDb;
}

function createFTSTable(db: Database.Database, tableName: string): void {
  const createFTSQuery = `
    CREATE VIRTUAL TABLE IF NOT EXISTS ${tableName} USING fts5(
      objectId,
      content,
      sortOrder,
      bookCode,
      bookName,
      testament,
      chapterNumber,
      chapterId,
      verseNumber,
      type,
      subType,
      content_prefix='2 3'
    );
  `;

  db.exec(createFTSQuery);
  logger.info(
    `FTS table '${tableName}' created/verified with search optimization`,
  );
}

function clearFTSTable(db: Database.Database, tableName: string): void {
  db.exec(`DELETE FROM ${tableName};`);
  logger.info(`Cleared existing FTS data`);
}

async function insertVerses(
  targetDb: Database.Database,
  ftsTable: string,
): Promise<number> {
  // Get verses using Prisma with proper joins
  const verses = await prisma.verse.findMany({
    select: {
      id: true,
      text: true,
      number: true,
      chapterId: true,
      chapter: {
        select: {
          number: true,
          book: {
            select: {
              code: true,
              name: true,
              testament: true,
              bookOrder: true,
            },
          },
        },
      },
    },
    orderBy: [
      { chapter: { book: { bookOrder: 'asc' } } },
      { chapter: { number: 'asc' } },
      { number: 'asc' },
      { subVerseIndex: 'asc' },
    ],
  });

  const insertQuery = `
    INSERT INTO ${ftsTable} (
      objectId, content, sortOrder, bookCode, bookName, testament, chapterNumber, chapterId, type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'verse');
  `;

  const insert = targetDb.prepare(insertQuery);
  const insertMany = targetDb.transaction((records: typeof verses) => {
    records.forEach((verse) => {
      insert.run(
        verse.id,
        verse.text,
        verse.number,
        verse.chapter.book.code,
        verse.chapter.book.name,
        verse.chapter.book.testament,
        verse.chapter.number,
        verse.chapterId,
      );
    });
  });

  insertMany(verses);
  logger.info(`Inserted ${verses.length} verses`);
  return verses.length;
}

async function insertFootnotes(
  targetDb: Database.Database,
  ftsTable: string,
): Promise<number> {
  // Get footnotes using Mark model
  const footnotes = await prisma.mark.findMany({
    where: {
      kind: 'footnote',
    },
    select: {
      id: true,
      content: true,
      sortOrder: true,
      targetType: true,
      targetId: true,
      chapterId: true,
      chapter: {
        select: {
          number: true,
          book: {
            select: {
              code: true,
              name: true,
              testament: true,
              bookOrder: true,
            },
          },
        },
      },
    },
    orderBy: [
      { chapter: { book: { bookOrder: 'asc' } } },
      { chapter: { number: 'asc' } },
      { sortOrder: 'asc' },
    ],
  });

  // Get verse numbers for the targeted verses
  const verseIds = footnotes.map((f) => f.targetId);
  const verses = await prisma.verse.findMany({
    where: {
      id: { in: verseIds },
    },
    select: {
      id: true,
      number: true,
    },
  });

  const verseMap = new Map(verses.map((v) => [v.id, v.number]));

  const insertQuery = `
    INSERT INTO ${ftsTable} (
      objectId, content, sortOrder, bookCode, bookName, testament, chapterNumber, chapterId, verseNumber, type, subType
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'footnote', ?);
  `;

  const insert = targetDb.prepare(insertQuery);
  const insertMany = targetDb.transaction((records: typeof footnotes) => {
    records.forEach((footnote) => {
      const { chapter } = footnote;
      const { book } = chapter;
      const verseNumber = verseMap.get(footnote.targetId) || 0;

      insert.run(
        footnote.id,
        footnote.content,
        footnote.sortOrder,
        book.code,
        book.name,
        book.testament,
        chapter.number,
        footnote.chapterId,
        verseNumber,
        footnote.targetType || 'general',
      );
    });
  });

  insertMany(footnotes);
  logger.info(`Inserted ${footnotes.length} footnotes`);
  return footnotes.length;
}

async function insertHeadings(
  targetDb: Database.Database,
  ftsTable: string,
): Promise<number> {
  // Get headings using Prisma with proper joins
  const headings = await prisma.heading.findMany({
    select: {
      id: true,
      text: true,
      sortOrder: true,
      chapterId: true,
      verse: {
        select: {
          number: true,
        },
      },
      chapter: {
        select: {
          number: true,
          book: {
            select: {
              code: true,
              name: true,
              testament: true,
              bookOrder: true,
            },
          },
        },
      },
    },
    orderBy: [
      { chapter: { book: { bookOrder: 'asc' } } },
      { chapter: { number: 'asc' } },
      { sortOrder: 'asc' },
    ],
  });

  const insertQuery = `
    INSERT INTO ${ftsTable} (
      objectId, content, sortOrder, bookCode, bookName, testament, chapterNumber, chapterId, type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'heading');
  `;

  const insert = targetDb.prepare(insertQuery);
  const insertMany = targetDb.transaction((records: typeof headings) => {
    records.forEach((heading) => {
      insert.run(
        heading.id,
        heading.text,
        heading.sortOrder,
        heading.chapter.book.code,
        heading.chapter.book.name,
        heading.chapter.book.testament,
        heading.chapter.number,
        heading.chapterId,
      );
    });
  });

  insertMany(headings);
  logger.info(`Inserted ${headings.length} headings`);
  return headings.length;
}

async function insertPsalmMetadata(
  targetDb: Database.Database,
  ftsTable: string,
): Promise<number> {
  // Get psalm metadata using Prisma with proper joins
  const psalmMetadata = await prisma.psalmMetadata.findMany({
    select: {
      id: true,
      text: true,
      sortOrder: true,
      chapterId: true,
      chapter: {
        select: {
          number: true,
          book: {
            select: {
              code: true,
              name: true,
              testament: true,
              bookOrder: true,
            },
          },
        },
      },
    },
    orderBy: [
      { chapter: { book: { bookOrder: 'asc' } } },
      { chapter: { number: 'asc' } },
      { sortOrder: 'asc' },
    ],
  });

  const insertQuery = `
    INSERT INTO ${ftsTable} (
      objectId, content, sortOrder, bookCode, bookName, testament, chapterNumber, chapterId, type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'psalm_metadata');
  `;

  const insert = targetDb.prepare(insertQuery);
  const insertMany = targetDb.transaction((records: typeof psalmMetadata) => {
    records.forEach((metadata) => {
      insert.run(
        metadata.id,
        metadata.text,
        metadata.sortOrder,
        metadata.chapter.book.code,
        metadata.chapter.book.name,
        metadata.chapter.book.testament,
        metadata.chapter.number,
        metadata.chapterId,
      );
    });
  });

  insertMany(psalmMetadata);
  logger.info(`Inserted ${psalmMetadata.length} psalm metadata entries`);
  return psalmMetadata.length;
}

async function insertCrossReferences(
  targetDb: Database.Database,
  ftsTable: string,
): Promise<number> {
  // Get cross-references using Mark model
  const crossReferences = await prisma.mark.findMany({
    where: {
      kind: 'cross-reference',
    },
    select: {
      id: true,
      content: true,
      sortOrder: true,
      targetType: true,
      targetId: true,
      chapterId: true,
      chapter: {
        select: {
          number: true,
          book: {
            select: {
              code: true,
              name: true,
              testament: true,
              bookOrder: true,
            },
          },
        },
      },
    },
    orderBy: [
      { chapter: { book: { bookOrder: 'asc' } } },
      { chapter: { number: 'asc' } },
      { sortOrder: 'asc' },
    ],
  });

  // Get verse numbers for the targeted verses
  const verseIds = crossReferences.map((f) => f.targetId);
  const verses = await prisma.verse.findMany({
    where: {
      id: { in: verseIds },
    },
    select: {
      id: true,
      number: true,
    },
  });

  const verseMap = new Map(verses.map((v) => [v.id, v.number]));

  const insertQuery = `
    INSERT INTO ${ftsTable} (
      objectId, content, sortOrder, bookCode, bookName, testament, chapterNumber, chapterId, verseNumber, type, subType
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'cross-reference', ?);
  `;

  const insert = targetDb.prepare(insertQuery);
  const insertMany = targetDb.transaction((records: typeof crossReferences) => {
    records.forEach((crossRef) => {
      const { chapter } = crossRef;
      const { book } = chapter;
      const verseNumber = verseMap.get(crossRef.targetId) || 0;

      insert.run(
        crossRef.id,
        crossRef.content,
        crossRef.sortOrder,
        book.code,
        book.name,
        book.testament,
        chapter.number,
        crossRef.chapterId,
        verseNumber,
        crossRef.targetType || 'general',
      );
    });
  });

  insertMany(crossReferences);
  logger.info(`Inserted ${crossReferences.length} cross-references`);
  return crossReferences.length;
}

// Generate FTS index with optional custom database name
async function generateFTSIndex(
  targetDbPath: string,
  ftsTableName = 'content_fts',
): Promise<void> {
  let targetDb: Database.Database | undefined;
  let totalRecords = 0;

  try {
    // Setup target database
    targetDb = await setupDatabase(targetDbPath);

    // Create and clear FTS table
    createFTSTable(targetDb, ftsTableName);
    clearFTSTable(targetDb, ftsTableName);

    // Insert all content types using Prisma
    totalRecords += await insertVerses(targetDb, ftsTableName);
    totalRecords += await insertFootnotes(targetDb, ftsTableName);
    totalRecords += await insertHeadings(targetDb, ftsTableName);
    totalRecords += await insertPsalmMetadata(targetDb, ftsTableName);
    totalRecords += await insertCrossReferences(targetDb, ftsTableName);

    logger.info(`FTS injection completed`);
    logger.info(`Total records inserted: ${totalRecords.toLocaleString()}`);
    logger.info(`FTS table '${ftsTableName}' ready for search`);
  } catch (error) {
    logger.error(`FTS injection failed:`, error);
    throw error;
  } finally {
    // Clean up connections
    if (targetDb) {
      targetDb.close();
      logger.info(`Target database connection closed`);
    }

    await prisma.$disconnect();
    logger.info(`Prisma connection closed`);
  }
}

export { generateFTSIndex };
