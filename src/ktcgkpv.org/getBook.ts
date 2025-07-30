import { type Version } from '@prisma/client';
import { groupBy, retry } from 'es-toolkit';
import { chromium, devices } from 'playwright';
import { versionMapping } from '@/ktcgkpv.org/mapping';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

const getBook = async (version: Version) => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  const versionCode = version.code as keyof typeof versionMapping;

  await retry(
    async () => {
      await page.goto(
        `https://ktcgkpv.org/bible?version=${versionMapping[versionCode].number}`,
      );
    },
    {
      retries: 5,
    },
  );

  // NOTE: This will contains list of li that contains list of books that for
  // each chapter. Like chapter 1 only for book2, book3,...
  const chapterTemplateEl = await page
    .locator('[id="chapterPopover"]')
    .locator('li')
    .all();

  const bookChapters = groupBy(
    (
      await Promise.all(
        chapterTemplateEl.map(async (chapterEl) => {
          const bookLabelNumberList = (await chapterEl.getAttribute('class'))
            ?.split(' ')
            .map((cn) => cn.replace('book', ''));

          const chapterNumber = Number.parseInt(
            (await chapterEl.locator('a').getAttribute('data-chapter')) || '',
            10,
          );

          if (!bookLabelNumberList || Number.isNaN(chapterNumber)) {
            return [];
          }

          return bookLabelNumberList.map((bookLabelNumber) => ({
            bookLabelNumber,
            chapterNumber,
          }));
        }),
      )
    ).flat(),
    (item) => item.bookLabelNumber,
  );

  const ntBookList = (
    await page
      .locator('[id="bookSelectDialog"]')
      .locator('div[class="row"]', {
        hasText: 'Tân Ước',
      })
      .locator('xpath=/following-sibling::div')
      .locator('div', {
        hasNot: page.locator('button[data-book-isintro="1"]'),
      })
      .all()
  ).map((locator) => ({
    locator,
    testament: 'nt',
  }));

  const otBookList = (
    await page
      .locator('[id="bookSelectDialog"]')
      .locator('div[class="row"]', {
        hasText: 'Tân Ước',
      })
      .locator('xpath=/preceding-sibling::div')
      .locator('div', {
        hasNot: page.locator('button[data-book-isintro="1"]'),
        hasNotText: /Cựu Ước|Tân Ước/,
      })
      .all()
  ).map((locator) => ({
    locator,
    testament: 'ot',
  }));

  const bookData = await Promise.all(
    [...otBookList, ...ntBookList].map(
      async ({ locator: bookEl, testament }) => {
        // NOTE: This is also have intro book so this number will different from
        // the actual book order
        const bookLabelNumber = (
          await bookEl.locator('button').getAttribute('data-book-id')
        )?.trim();

        const bookOrder = Number.parseInt(
          (await bookEl.locator('span').textContent()) || '',
          10,
        );

        const bookCode = (
          await bookEl.locator('button').getAttribute('data-book-abbr')
        )
          ?.toLowerCase()
          .trim();

        const bookName = (await bookEl.locator('button').textContent())?.trim();

        if (
          !bookLabelNumber ||
          Number.isNaN(bookOrder) ||
          !bookCode ||
          !bookName
        ) {
          return null;
        }

        return {
          bookLabelNumber,
          bookCode,
          bookName,
          testament,
          bookOrder,
        };
      },
    ),
  );

  await context.close();
  await browser.close();

  const newBooks = await Promise.all(
    bookData
      .filter((val) => !!val)
      .map(
        async ({
          bookCode,
          bookLabelNumber,
          bookName,
          bookOrder,
          testament,
        }) => {
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
              testament,
              bookOrder,
              versionId: version.id,
            },
            update: {
              code: bookCode,
              name: bookName,
              testament,
              bookOrder,
            },
          });

          logger.info('Get book %s - %s', bookCode, bookName);

          const chapterList = bookChapters[bookLabelNumber] || [];

          const newChapters = await Promise.all(
            chapterList.map(async (chapter) => {
              const newChapter = await prisma.chapter.upsert({
                where: {
                  bookId_number: {
                    bookId: newBook.id,
                    number: chapter.chapterNumber,
                  },
                },
                create: {
                  number: chapter.chapterNumber,
                  bookId: newBook.id,
                },
                update: {
                  number: chapter.chapterNumber,
                },
              });

              return newChapter;
            }),
          );

          logger.info('Get chapters for book %s', bookName);

          return { book: newBook, chapters: newChapters };
        },
      ),
  );

  return newBooks;
};

export { getBook };
