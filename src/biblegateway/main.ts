/* eslint-disable no-restricted-syntax */
import { mkdir } from 'fs/promises';
import { getAll } from '@/biblegateway/get-all';
import { getBook } from '@/biblegateway/get-book';
import { getPsalmMeta } from '@/biblegateway/get-psalm-meta';
import { getVersion } from '@/biblegateway/get-version';
import { withCheckpoint } from '@/lib/checkpoint';
import prisma from '@/prisma/prisma';

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

  await mkdir('./dist', { recursive: true });

  await withCheckpoint(
    books,
    async (chapters, setCheckpoint) => {
      for await (const chap of chapters) {
        await getAll(chap);

        if (chap.book.code === 'ps') {
          await getPsalmMeta(chap);
        }

        await setCheckpoint({
          bookCode: chap.book.code,
          chapterNumber: chap.number,
          completed: true,
        });
      }
    },
    `./dist/${version.code}.json`,
  );
})();
