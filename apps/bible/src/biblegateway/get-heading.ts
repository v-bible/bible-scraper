/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import { Prisma } from '@prisma/client';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

const getHeading = async (
  chap: Prisma.BookChapterGetPayload<{
    include: {
      book: true;
    };
  }>,
) => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Ad-blocker
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  await blocker.enableBlockingInPage(page);

  await retry(
    async () => {
      await page.goto(`https://www.biblegateway.com${chap.url}`, {
        timeout: 36000, // In milliseconds is 36 seconds
      });
    },
    {
      retries: 5,
    },
  );

  const headings = await page
    .locator('[data-translation]')
    .locator('css=h3')
    .all();

  // NOTE: Match the chap and verse num in the verse string. Ex: "Gen-2-4".
  const reVerse = /(?<name>\w+)-(?<chap>\d+)-(?<verseNum>\d+)/;

  const headingData = await Promise.all(
    headings.map(async (el) => {
      // NOTE: In case it has a span inside
      const spanEl = el.locator('css=span').first();

      const classAttr = await spanEl.getAttribute('class');

      const content = await spanEl.textContent();

      if (!classAttr || !content) return [];

      const match = classAttr.match(reVerse);

      if (!match?.groups) return [];

      const verseData = await prisma.bookVerse.findFirstOrThrow({
        where: {
          number: Number(match?.groups!.verseNum),
          // NOTE: Heading always placed before the verse
          order: 0,
          chapterId: chap.id,
        },
      });

      logger.info(
        `getting heading: ${content} for verse ${verseData.number} in ${chap.book.title} ${chap.number}}`,
      );

      return [
        {
          content,
          verseId: verseData.id,
          chapterId: chap.id,
        },
      ];
    }),
  );

  const headingDataFlat = headingData.flat();

  await prisma.bookHeading.createMany({
    data: headingDataFlat,
    skipDuplicates: true,
  });

  await context.close();
  await browser.close();
};

export { getHeading };
