/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import { Prisma } from '@prisma/client';
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

  await page.goto(`https://www.biblegateway.com${targetVersion.url}`);

  const books = await page.getByRole('row').all();

  for (const row of books) {
    const bookClassAttr = await row.getAttribute('class');

    if (!bookClassAttr) continue;

    const reBookCode = /(?<code>\w+)-list/;
    const reBookType = /(?<type>\w+)-book/;

    const bookCode = bookClassAttr.match(reBookCode)?.groups!.code;

    const bookType = bookClassAttr.match(reBookType)?.groups!.type;

    const bookTitle = await row
      .getByRole('cell')
      .and(page.locator('css=[data-target]'))
      .innerText();

    if (!bookCode || !bookTitle || !bookType) return;

    const book = await prisma.book.upsert({
      where: {
        code: bookCode,
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

    logger.info(`getting chapters for book: ${bookTitle} (${bookCode})`);

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
          url: chapterUrl,
        },
        create: {
          number: +chapterNumber,
          url: chapterUrl,
          book: {
            connect: {
              code: bookCode,
            },
          },
        },
      });
    }
  }

  await context.close();
  await browser.close();
};

export { getBook };
