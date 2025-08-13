import { PlaywrightBlocker } from '@ghostery/adblocker-playwright';
import { type Version } from '@prisma/client';
import { retry } from 'es-toolkit';
import { chromium, devices } from 'playwright';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

const getBook = async (version: Version) => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Ad-blocker
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  await blocker.enableBlockingInPage(page);

  await retry(
    async () => {
      await page.goto(version.sourceUrl);
    },
    {
      retries: 5,
    },
  );

  const books = await page
    .locator('[class*="booklist-content"]')
    .locator('table')
    .locator('tr')
    .all();

  // NOTE: Match book code in class. Ex: "gen-list".
  const reBookCode = /(?<code>\w+)-list/;
  // NOTE: Match book type in class. Ex: "ot-book", "nt-book" or "ap-book".
  const reBookType = /(?<type>\w+)-book/;

  const newBooks = (
    await Promise.all(
      books.map(async (row, index) => {
        const bookClassAttr = await row.getAttribute('class');

        if (!bookClassAttr) return [];

        const bookCode = bookClassAttr.match(reBookCode)?.groups!.code;

        const bookType = bookClassAttr.match(reBookType)?.groups!.type;

        const bookName = await row
          .locator('td')
          .and(page.locator('css=[data-target]'))
          .innerText();

        if (!bookCode || !bookName || !bookType) return [];

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
            testament: bookType,
            bookOrder: index + 1,
            versionId: version.id,
          },
          update: {
            code: bookCode,
            name: bookName,
            testament: bookType,
            bookOrder: index + 1,
          },
        });

        logger.info('Get book %s - %s', bookCode, bookName);

        const chapters = await row
          .locator('td')
          .filter({
            has: page.locator('a'),
          })
          .locator('a')
          .all();

        const newChapters = (
          await Promise.all(
            chapters.map(async (chapter) => {
              const chapterRef = await chapter.getAttribute('href');
              const chapterNumber = await chapter.innerText();

              if (!chapterRef || !chapterNumber) return null;

              const newChapter = await prisma.chapter.upsert({
                where: {
                  bookId_number: {
                    bookId: newBook.id,
                    number: +chapterNumber,
                  },
                },
                create: {
                  number: +chapterNumber,
                  bookId: newBook.id,
                },
                update: {
                  number: +chapterNumber,
                },
              });

              return newChapter;
            }),
          )
        ).filter((chapter) => !!chapter);

        logger.info('Get chapters for book %s', bookName);

        return { book: newBook, chapters: newChapters };
      }),
    )
  ).flat();

  await context.close();
  await browser.close();

  return newBooks;
};

export { getBook };
