import { readFile, writeFile } from 'fs/promises';
import { type Book, type Prisma } from '@prisma/client';
import prisma from '@/prisma/prisma';

export type Checkpoint = {
  bookCode: string;
  chapterNumber: number;
  completed: boolean;
};

const withCheckpoint = async (
  books: Book[],
  fn: (
    filteredChapters: Prisma.BookChapterGetPayload<{
      include: {
        book: true;
      };
    }>[],
    setCheckpoint: (cp: Checkpoint) => Promise<void>,
  ) => Promise<void>,
  fileName: string = './checkpoint.json',
) => {
  // Open file to read, create new file is not exists
  try {
    await readFile(fileName, 'utf-8');
  } catch (error) {
    await writeFile(fileName, '[]', 'utf-8');
  }

  const data = await readFile(fileName, 'utf-8');

  let parsedData = JSON.parse(data) as Checkpoint[];

  const chapters = (
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

  if (parsedData?.length === 0) {
    const initialData: Checkpoint[] = chapters.map((chap) => ({
      bookCode: chap.book.code,
      chapterNumber: chap.number,
      completed: false,
    }));

    parsedData = initialData;

    await writeFile(fileName, JSON.stringify(initialData, null, 2), 'utf-8');
  }

  const filteredChapters = chapters.filter((chap) => {
    if (!parsedData) {
      return true;
    }

    const checkpointIdx = parsedData.findIndex(
      (item: Checkpoint) =>
        item.bookCode === chap.book.code &&
        item.chapterNumber === chap.number &&
        !item.completed,
    );
    return checkpointIdx !== -1;
  });

  await fn(filteredChapters, async (cp: Checkpoint) => {
    const idx = parsedData.findIndex(
      (item: Checkpoint) =>
        item.bookCode === cp.bookCode &&
        item.chapterNumber === cp.chapterNumber,
    );

    if (idx !== -1) {
      parsedData[idx]!.completed = cp.completed;
    }

    await writeFile(fileName, JSON.stringify(parsedData, null, 2), 'utf-8');
  });
};

export { withCheckpoint };
