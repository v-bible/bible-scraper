/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import { Prisma } from '@prisma/client';
import { chromium, devices } from 'playwright';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Ad-blocker
  PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) =>
    blocker.enableBlockingInPage(page),
  );

  const targetVersion = {
    type_url: {
      type: 'ebook',
      url: '/versions/Bản-Dịch-BD2011/#booklist',
    },
  } satisfies Prisma.VersionFormatWhereUniqueInput;

  const { versionId } = await prisma.versionFormat.findUniqueOrThrow({
    where: targetVersion,
    select: {
      versionId: true,
    },
  });

  await page.goto(`https://www.biblegateway.com${targetVersion.type_url.url}`);

  const books = await page.getByRole('row').all();

  for (const row of books) {
    const bookData = row
      .getByRole('cell')
      .and(page.locator('css=[data-target]'));

    const reBookCode = /\.(\w+)-list/;
    const bookCode = (await bookData.getAttribute('data-target'))?.match(
      reBookCode,
    )?.[1];
    const bookTitle = await bookData.innerText();

    if (!bookCode || !bookTitle) continue;

    const book = await prisma.book.upsert({
      where: {
        code: bookCode,
      },
      update: {
        code: bookCode,
        title: bookTitle,
      },
      create: {
        code: bookCode,
        title: bookTitle,
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
})();
