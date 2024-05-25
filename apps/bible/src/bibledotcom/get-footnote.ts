/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import type { Prisma } from '@prisma/client';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

const getFootnote = async (
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
      await page.goto(`https://www.bible.com${chap.url}`, {
        timeout: 36000, // In milliseconds is 36 seconds
      });
    },
    {
      retries: 5,
    },
  );

  let fnCount = 0;

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
    paragraphs.map(async (par, idx) => {
      // Ref: https://playwright.dev/docs/other-locators#css-elements-that-contain-other-elements
      const verseCount = await par.locator('css=[data-usfm]').count();

      for (let i = 0; i < verseCount; i += 1) {
        const verseEl = par.locator('css=[data-usfm]').nth(i);

        const usfmData = await verseEl.getAttribute('data-usfm');

        if (!usfmData) continue;

        const match = usfmData.match(reClassVerse);

        if (!match?.groups) continue;

        const content = await verseEl.textContent();

        const fnElList = await verseEl
          .locator('css=[class*="ChapterContent_note" i]')
          .all();

        for (const fnEl of fnElList) {
          let fnContent = await fnEl.textContent();

          if (!fnContent) continue;

          // NOTE: Remove the '#' from the beginning of the string and trim it
          fnContent = fnContent.replace('#', '').trim();

          const verseData = await prisma.bookVerse.findFirstOrThrow({
            where: {
              number: Number(match.groups?.verseNum),
              parNum: idx,
              parIdx: i,
              chapterId: chap.id,
            },
          });

          const fnPos = content!.indexOf(fnContent);

          logger.info(
            `getting footnote ${fnContent} for verse ${verseData.number} in ${chap.book.title} ${chap.number}`,
          );

          await prisma.bookFootnote.upsert({
            where: {
              verseId: verseData.id,
            },
            create: {
              content: fnContent,
              order: fnCount,
              position: fnPos,
              chapterId: chap.id,
              verseId: verseData.id,
            },
            update: {
              content: fnContent,
              order: fnCount,
              position: fnPos,
            },
          });

          fnCount += 1;
        }
      }
    }),
  );

  await context.close();
  await browser.close();
};

export { getFootnote };
