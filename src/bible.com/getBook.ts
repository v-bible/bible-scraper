import { type Version } from '@prisma/client';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

type BookData = {
  usfm: string;
  canon: string;
  human: string;
  chapters: Record<string, string>[];
};

const getBook = async (version: Version) => {
  const bookId = version.sourceUrl.split('/').pop()?.split('-').shift();

  const bookData = await (
    await fetch(`https://www.bible.com/api/bible/version/${bookId}`)
  ).json();

  const newBooks = await Promise.all(
    (bookData.books as BookData[]).map(async (book, index) => {
      const bookCode = book.usfm.toLowerCase();

      const bookName = book.human;

      const newBook = await prisma.book.upsert({
        where: {
          code_versionId: {
            code: bookCode,
            versionId: version.id,
          },
        },
        create: {
          code: bookCode,
          name: bookName,
          testament: book.canon,
          bookOrder: index + 1,
          versionId: version.id,
        },
        update: {
          code: bookCode,
          name: bookName,
          testament: book.canon,
          bookOrder: index + 1,
        },
      });

      logger.info('Get book %s - %s', bookCode, bookName);

      const newChapters = (
        await Promise.all(
          book.chapters.map(async (chapter: Record<string, string>) => {
            // NOTE: Might have weird string like: "{toc: true, usfm: "LUK.INTRO1",
            // human: "Ɛkuma nub yi nwɛr a Luk", canonical: false}"
            if (!Number(chapter.human)) return null;

            const bookNumber = Number(chapter.human);

            const newChapter = await prisma.chapter.upsert({
              where: {
                bookId_number: {
                  bookId: newBook.id,
                  number: bookNumber,
                },
              },
              create: {
                number: bookNumber,
                bookId: newBook.id,
              },
              update: {
                number: bookNumber,
              },
            });

            return newChapter;
          }),
        )
      ).filter((chapter) => !!chapter);

      logger.info('Get chapters for book %s', bookName);

      return { book: newBook, chapters: newChapters };
    }),
  );

  return newBooks;
};

export { getBook };
