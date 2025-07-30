import path from 'path';
import { type Prisma } from '@prisma/client';
import { getBook } from '@/ktcgkpv.org/getBook';
import { getVerse } from '@/ktcgkpv.org/getVerse';
import { getVersion } from '@/ktcgkpv.org/getVersion';
import { versionMapping } from '@/ktcgkpv.org/mapping';
import { withCheckpoint } from '@/lib/checkpoint';

const main = async () => {
  const versionCode = 'KT2011' satisfies keyof typeof versionMapping;

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
        `ktcgkpv.org-${versionCode}-checkpoint.json`,
      ),
    });

  // eslint-disable-next-line no-restricted-syntax
  for await (const checkpoint of chapterCheckpoint) {
    const chapter = checkpoint.params;

    await getVerse(chapter.book, chapter, { versionCode });

    setCheckpointComplete(checkpoint.id, true);
  }
};

main();
