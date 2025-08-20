import path from 'path';
import { type Prisma } from '@prisma/client';
import { getBook } from '@/biblegateway.com/getBook';
import { getVerse } from '@/biblegateway.com/getVerse';
import { getVersion } from '@/biblegateway.com/getVersion';
import { withCheckpoint } from '@/lib/checkpoint';
import { generateFTSIndex } from '@/lib/inject-fts';
import { logger } from '@/logger/logger';

const main = async () => {
  const startTime = Date.now();
  logger.info(
    `🚀 Starting scraping biblegateway.com at ${new Date().toISOString()}`,
  );

  const versionCode = 'BD2011';

  const versions = await getVersion();

  const currentVersion = versions.find(
    (v) => v.code === versionCode && v.formatType === 'ebook',
  )!;

  const books = await getBook(currentVersion);

  const allChapters = books.flatMap(({ book, chapters }) =>
    chapters.map((chapter) => ({
      book,
      ...chapter,
    })),
  );

  const { filteredCheckpoint: chapterCheckpoint, setCheckpointComplete } =
    await withCheckpoint<
      Prisma.ChapterGetPayload<{
        include: {
          book: true;
        };
      }>
    >({
      getInitialData: async () => {
        return allChapters;
      },
      getCheckpointId: (data) => {
        return data.id;
      },
      filterCheckpoint: (checkpoint) => !checkpoint.completed,
      filePath: path.join(
        __dirname,
        '../../dist',
        `biblegateway.com-${versionCode}-checkpoint.json`,
      ),
    });

  // eslint-disable-next-line no-restricted-syntax
  for await (const checkpoint of chapterCheckpoint) {
    const chapter = checkpoint.params;

    await getVerse(chapter.book, chapter, { version: currentVersion });

    setCheckpointComplete(checkpoint.id, true);
  }

  const endTime = Date.now();
  const duration = endTime - startTime;
  const durationInSeconds = (duration / 1000).toFixed(2);
  const durationInMinutes = (duration / 60000).toFixed(2);

  logger.info(`✅ Scraping completed at ${new Date().toISOString()}`);
  logger.info(
    `⏱️  Total scraping time: ${durationInSeconds}s (${durationInMinutes}m)`,
  );
  logger.info(
    `📚 Processed ${chapterCheckpoint.length} chapters for version ${versionCode}`,
  );

  // Generate FTS index after scraping is complete
  logger.info(`🔍 Generating FTS search index...`);
  await generateFTSIndex(
    path.join(
      __dirname,
      '../../dist',
      `${versionCode.toLowerCase()}_fts.sqlite3`,
    ),
  );
};

main();
