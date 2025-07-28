/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
// import { PlaywrightBlocker } from '@ghostery/adblocker-playwright';
import { Prisma } from '@prisma/client';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

const getPsalmMeta = async (
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
  // const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  // await blocker.enableBlockingInPage(page);

  await retry(
    async () => {
      await page.goto(chap.ref, {
        timeout: 36000, // In milliseconds is 36 seconds
      });
    },
    {
      retries: 5,
    },
  );

  const pars = await page.locator('css=[class*="ChapterContent_d" i]').all();

  await Promise.all(
    pars.map(async (el) => {
      const title = await el.textContent();

      if (!title) return;

      logger.info(
        'Get Psalm metadata %s for book %s',
        chap.number,
        chap.book.title,
      );

      logger.debug('Psalm metadata %s content: %s', chap.number, title);

      await prisma.psalmMetadata.upsert({
        where: {
          chapterId: chap.id,
        },
        create: {
          title,
          chapter: { connect: { id: chap.id } },
        },
        update: {
          title,
        },
      });
    }),
  );

  await context.close();
  await browser.close();
};

export { getPsalmMeta };
