/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { getAll } from '@/ktcgkpv/get-all';
import { getBook } from '@/ktcgkpv/get-book';
import prisma from '@/prisma/prisma';

(async () => {
  await getBook();

  const version = await prisma.version.findFirstOrThrow({
    where: {
      code: 'KT2011',
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
    }
  }
})();
