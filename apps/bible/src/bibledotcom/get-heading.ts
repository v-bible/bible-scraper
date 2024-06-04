/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import type { Prisma } from '@prisma/client';
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
      await page.goto(chap.url, {
        timeout: 36000, // In milliseconds is 36 seconds
      });
    },
    {
      retries: 5,
    },
  );

  const paragraphs = await page
    // NOTE: Paragraph
    .locator('css=[class*="ChapterContent_p" i]')
    // NOTE: Poetry
    .or(page.locator('css=[class*="ChapterContent_q" i]'))
    // NOTE: End paragraph
    .or(page.locator('css=[class*="ChapterContent_m" i]'))
    // NOTE: Heading
    .or(page.locator('css=[class*="ChapterContent_s" i]'))
    .all();

  // NOTE: Match the chap and verse num in the class string. Ex: "GEN.2.4".
  const reClassVerse = /(?<name>\w+)\.(?<chap>\d+)\.(?<verseNum>\d+)/;

  await Promise.all(
    paragraphs.map(async (par, idx, arr) => {
      const classAttr = await par.getAttribute('class');

      // NOTE: Skip if the class attribute does not contain heading class
      if (classAttr?.search(/_s.+__/) === -1) {
        return;
      }

      const heading = await par.textContent();

      if (!heading) return;

      // NOTE: A heading always placed before the verse
      const nextVerse = arr[idx + 1]?.locator('css=[data-usfm]').first();

      const nextVerseData = await nextVerse?.getAttribute('data-usfm');

      if (!nextVerseData) return;

      const match = nextVerseData.match(reClassVerse);

      if (!match?.groups) return;

      const verseData = await prisma.bookVerse.findFirstOrThrow({
        where: {
          number: Number(match?.groups!.verseNum),
          // NOTE: Heading always placed before the verse
          order: 0,
          chapterId: chap.id,
        },
      });
      logger.info(
        `getting heading: ${heading} for verse ${verseData.number} in ${chap.book.title} ${chap.number}}`,
      );

      await prisma.bookHeading.upsert({
        where: {
          verseId: verseData.id,
        },
        create: {
          content: heading,
          verseId: verseData.id,
          chapterId: chap.id,
        },
        update: {
          content: heading,
        },
      });
    }),
  );

  await context.close();
  await browser.close();
};

export { getHeading };
