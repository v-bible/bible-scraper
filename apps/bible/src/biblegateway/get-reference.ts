/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import { Prisma } from '@prisma/client';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

const getReference = async (
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
      await page.goto(chap.url, {
        timeout: 36000, // In milliseconds is 36 seconds
      });
    },
    {
      retries: 5,
    },
  );

  const refs = await page
    .locator('[data-translation]')
    .locator('css=[class="reference"]')
    .all();

  // NOTE: Match the chap and verse num in the class string. Ex: "Gen-2-4".
  const reClassVerse = /(?<name>\w+)-(?<chap>\d+)-(?<verseNum>\d+)/;

  const refData = await Promise.all(
    refs.map(async (el) => {
      const classAttr = await el.locator('css=span').getAttribute('class');

      if (!classAttr) return [];

      const match = classAttr.match(reClassVerse);

      if (!match?.groups) return [];

      let refContent = await el.textContent();

      if (!refContent) return [];

      refContent = refContent.trim();

      const verse = await prisma.bookVerse.findFirstOrThrow({
        where: {
          number: Number(match.groups.verseNum),
          order: 0,
          chapterId: chap.id,
        },
      });

      logger.info(
        'Get reference %s:%s for book %s',
        chap.number,
        verse.number,
        chap.book.title,
      );

      logger.debug(
        'Reference %s:%s content: %s',
        chap.number,
        verse.number,
        refContent,
      );

      return [
        {
          content: refContent,
          chapterId: chap.id,
          verseId: verse.id,
        },
      ];
    }),
  );

  const refDataFlat = refData.flat();

  await prisma.bookReference.createMany({
    data: refDataFlat,
    skipDuplicates: true,
  });

  await context.close();
  await browser.close();
};

export { getReference };
