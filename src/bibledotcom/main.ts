/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Agent, setGlobalDispatcher } from 'undici';
import { getBook } from '@/bibledotcom/get-book';
import { getFootnote } from '@/bibledotcom/get-footnote';
import { getHeading } from '@/bibledotcom/get-heading';
import { getPsalmMeta } from '@/bibledotcom/get-psalm-meta';
import { getReference } from '@/bibledotcom/get-reference';
import { getVerse } from '@/bibledotcom/get-verse';
import { getVersionByLang } from '@/bibledotcom/get-version';
import prisma from '@/prisma/prisma';

setGlobalDispatcher(new Agent({ connect: { timeout: 60_000 } }));

(async () => {
  // NOTE: You can use "getVersion" func to scrap all the versions available.
  await getVersionByLang('vie');

  const version = await prisma.version.findFirstOrThrow({
    where: {
      code: 'BD2011',
      language: {
        webOrigin: 'https://www.bible.com',
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
    include: {
      version: true,
    },
  });

  await getBook(versionFormat);

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
      if (book.code === 'psa') {
        await getPsalmMeta(chap);
      }
    }
  }
})();
