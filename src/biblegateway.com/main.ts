/* eslint-disable no-restricted-syntax */
import path from 'path';
import { type Prisma } from '@prisma/client';
import { Agent, setGlobalDispatcher } from 'undici';
import { getAll } from '@/biblegateway.com/get-all';
import { getBook } from '@/biblegateway.com/get-book';
import { getPsalmMeta } from '@/biblegateway.com/get-psalm-meta';
import { getVersion } from '@/biblegateway.com/get-version';
import { withCheckpoint } from '@/lib/checkpoint';
import prisma from '@/prisma/prisma';

setGlobalDispatcher(new Agent({ connect: { timeout: 60_000 } }));

(async () => {
  await getVersion();

  const version = await prisma.version.findFirstOrThrow({
    where: {
      code: 'BD2011',
      language: {
        webOrigin: 'https://www.biblegateway.com',
      },
    },
    include: {
      formats: true,
    },
  });

  const versionFormat = await prisma.versionFormat.findFirstOrThrow({
    where: {
      versionId: version.id,
      type: 'ebook',
    },
  });

  await getBook({
    type: versionFormat.type,
    ref: versionFormat.ref,
  });

  const books = await prisma.book.findMany({
    where: {
      versionId: version.id,
    },
  });

  const { filteredCheckpoint: chapterCheckpoint, setCheckpointComplete } =
    await withCheckpoint<
      Prisma.BookChapterGetPayload<{
        include: {
          book: true;
        };
      }>
    >({
      getInitialData: async () => {
        return (
          await Promise.all(
            books.map((book) => {
              return prisma.bookChapter.findMany({
                where: {
                  bookId: book.id,
                },
                include: {
                  book: true,
                },
              });
            }),
          )
        ).flat();
      },
      getCheckpointId: (data) => {
        return data.id;
      },
      filterCheckpoint: (checkpoint) => !checkpoint.completed,
      filePath: path.join(
        __dirname,
        '../../dist',
        `bible.com-${version.code}-checkpoint.json`,
      ),
    });

  for await (const checkpoint of chapterCheckpoint) {
    const chapter = checkpoint.params;

    await getAll(chapter);
    if (chapter.book.code === 'ps') {
      await getPsalmMeta(chapter);
    }

    setCheckpointComplete(checkpoint.id, true);
  }
})();
