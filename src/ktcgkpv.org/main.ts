/* eslint-disable no-restricted-syntax */
import path from 'path';
import { type Prisma } from '@prisma/client';
import { Agent, setGlobalDispatcher } from 'undici';
import { getAll } from '@/ktcgkpv.org/get-all';
import { getBook } from '@/ktcgkpv.org/get-book';
import { versionMapping } from '@/ktcgkpv.org/mapping';
import { withCheckpoint } from '@/lib/checkpoint';
import prisma from '@/prisma/prisma';

setGlobalDispatcher(new Agent({ connect: { timeout: 60_000 } }));

(async () => {
  const versionCode = 'KT2011' satisfies keyof typeof versionMapping;

  await getBook(versionCode);

  const version = await prisma.version.findFirstOrThrow({
    where: {
      code: versionCode,
      language: {
        webOrigin: 'https://ktcgkpv.org/',
      },
    },
    include: {
      formats: true,
    },
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
        `ktcgkpv.org-${version.code}-checkpoint.json`,
      ),
    });

  for await (const checkpoint of chapterCheckpoint) {
    const chapter = checkpoint.params;

    await getAll(chapter, versionCode);

    setCheckpointComplete(checkpoint.id, true);
  }
})();
