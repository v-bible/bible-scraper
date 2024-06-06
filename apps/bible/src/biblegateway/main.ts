/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { getBook } from '@/biblegateway/get-book';
import { getFootnote } from '@/biblegateway/get-footnote';
import { getHeading } from '@/biblegateway/get-heading';
import { getReference } from '@/biblegateway/get-reference';
import { getVerse } from '@/biblegateway/get-verse';
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
    url: versionFormat.url,
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
      // const verseChap = await prisma.bookVerse.findFirst({
      //   where: {
      //     chapterId: chap.id,
      //   },
      // });

      // if (!verseChap) {
      //   logger.info(`skipping ${chap.book.title} ${chap.number}`);
      //   continue;
      // }

      await getVerse(chap);
      await getFootnote(chap);
      await getHeading(chap);
      await getReference(chap);
    }
  }
})();
