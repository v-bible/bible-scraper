/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import { Prisma } from '@prisma/client';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

const getBook = async (
  targetVersion: Required<Prisma.VersionFormatTypeUrlCompoundUniqueInput>,
) => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Ad-blocker
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  await blocker.enableBlockingInPage(page);

  const { versionId } = await prisma.versionFormat.findUniqueOrThrow({
    where: { type_url: targetVersion },
    select: {
      versionId: true,
    },
  });

  await retry(
    async () => {
      await page.goto(targetVersion.url);
    },
    {
      retries: 5,
    },
  );

  const books = await page.getByRole('row').all();

  // NOTE: Match book code in class. Ex: "gen-list".
  const reBookCode = /(?<code>\w+)-list/;
  // NOTE: Match book type in class. Ex: "ot-book", "nt-book" or "ap-book".
  const reBookType = /(?<type>\w+)-book/;

  for (const row of books) {
    const bookClassAttr = await row.getAttribute('class');

    if (!bookClassAttr) continue;

    const bookCode = bookClassAttr.match(reBookCode)?.groups!.code;

    const bookType = bookClassAttr.match(reBookType)?.groups!.type;

    const bookTitle = await row
      .getByRole('cell')
      .and(page.locator('css=[data-target]'))
      .innerText();

    if (!bookCode || !bookTitle || !bookType) return;

    const book = await prisma.book.upsert({
      where: {
        code_versionId: {
          code: bookCode,
          versionId,
        },
      },
      update: {
        code: bookCode,
        title: bookTitle,
        type: bookType,
      },
      create: {
        code: bookCode,
        title: bookTitle,
        type: bookType,
        version: {
          connect: {
            id: versionId,
          },
        },
      },
    });

    const chapters = await row
      .getByRole('cell')
      .filter({
        has: page.getByRole('link'),
      })
      .getByRole('link')
      .all();

    for (const chapter of chapters) {
      const chapterUrl = await chapter.getAttribute('href');
      const chapterNumber = await chapter.innerText();

      if (!chapterUrl || !chapterNumber) continue;

      await prisma.bookChapter.upsert({
        where: {
          number: +chapterNumber,
          number_bookId: {
            number: +chapterNumber,
            bookId: book.id,
          },
        },
        update: {
          number: +chapterNumber,
          url: `https://www.biblegateway.com${chapterUrl}`,
        },
        create: {
          number: +chapterNumber,
          url: `https://www.biblegateway.com${chapterUrl}`,
          book: {
            connect: {
              code_versionId: {
                code: bookCode,
                versionId,
              },
            },
          },
        },
      });
    }

    logger.info('Get chapters for book %s', bookTitle);
  }

  await context.close();
  await browser.close();
};

export { getBook };
