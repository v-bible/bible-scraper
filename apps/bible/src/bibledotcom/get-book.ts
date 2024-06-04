/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Prisma } from '@prisma/client';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

const getBook = async (
  targetVersion: Prisma.VersionFormatGetPayload<{
    include: {
      version: true;
    };
  }>,
) => {
  const reBookId = /\/(?<bookId>\d+)/;

  const match = targetVersion.url.match(reBookId);

  const bookId = match?.groups!.bookId;

  const res = await fetch(`https://www.bible.com/api/bible/version/${bookId}`);
  const data = await res.json();

  for (const bookData of data.books) {
    logger.info(`getting book ${bookData.human} (${bookData.usfm})`);
    const book = await prisma.book.upsert({
      where: {
        code: bookData.usfm.toLowerCase(),
        versionId: targetVersion.versionId,
      },
      create: {
        code: bookData.usfm.toLowerCase(),
        type: bookData.canon,
        title: bookData.human,
        version: {
          connect: {
            id: targetVersion.version.id,
          },
        },
      },
      update: {
        code: bookData.usfm.toLowerCase(),
        type: bookData.canon,
        title: bookData.human,
      },
    });
    logger.info(
      `getting chapters for book: ${bookData.human} (${bookData.usfm})`,
    );
    for (const chap of bookData.chapters) {
      // NOTE: Might have weird string like: "{toc: true, usfm: "LUK.INTRO1",
      // human: "Ɛkuma nub yi nwɛr a Luk", canonical: false}"
      if (!Number(chap.human)) continue;
      await prisma.bookChapter.upsert({
        where: {
          number_bookId: {
            number: Number(chap.human),
            bookId: book.id,
          },
        },
        create: {
          number: Number(chap.human),
          // NOTE: Full link is: "/bible/37/GEN.1.CEB", but "/bible/37/GEN.1" or
          // "/bible/37/gen.1.ceb" still can resolved
          url: `https://www.bible.com/bible/${bookId}/${chap.usfm}.${targetVersion.version.code}`,
          book: {
            connect: {
              id: book.id,
            },
          },
        },
        update: {
          number: Number(chap.human),
          url: `https://www.bible.com/bible/${bookId}/${chap.usfm}.${targetVersion.version.code}`,
        },
      });
    }
  }
};

export { getBook };
