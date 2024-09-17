/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { getAll } from '@/biblegateway/get-all';
import { getBook } from '@/biblegateway/get-book';
import { getPsalmMeta } from '@/biblegateway/get-psalm-meta';
import { getVersion } from '@/biblegateway/get-version';
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

  for (const book of books) {
    const chapters = await prisma.bookChapter.findMany({
      where: {
        bookId: book.id,
      },
      include: {
        book: true,
      },
    });

    for (const chap of chapters) {
      await getAll(chap);
      if (book.code === 'ps') {
        await getPsalmMeta(chap);
      }
    }
  }
})();
