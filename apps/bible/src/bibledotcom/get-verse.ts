/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import type { Prisma } from '@prisma/client';
import retry from 'async-retry';
import lo from 'lodash';
import { chromium, devices } from 'playwright';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

const getVerse = async (
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
  // NOTE: Match the verse number at the beginning of the string. Ex: "1".
  const reVerseNum = /^\d+/;

  const verseInfo = await Promise.all(
    paragraphs.map(async (par, idx) => {
      const classAttr = await par.getAttribute('class');

      let isPoetry = false;

      // NOTE: Check if the class attribute contains poetry class
      if (classAttr?.search(/_q.+__/) !== -1) {
        isPoetry = true;
      }

      // Ref: https://playwright.dev/docs/other-locators#css-elements-that-contain-other-elements
      const verseCount = await par.locator('css=[data-usfm]').count();

      let verses: Array<{
        number: number;
        parNum: number;
        parIdx: number;
        content: string;
        isPoetry: boolean;
      }> = [];

      for (let i = 0; i < verseCount; i += 1) {
        const verseEl = par.locator('css=[data-usfm]').nth(i);

        const usfmData = await verseEl.getAttribute('data-usfm');

        if (!usfmData) continue;

        const match = usfmData.match(reClassVerse);

        if (!match?.groups) continue;

        let content = await verseEl.textContent();

        const fnElList = await verseEl
          .locator('css=[class*="ChapterContent_note" i]')
          .all();

        for (const fnEl of fnElList) {
          const fnContent = await fnEl.textContent();

          if (!fnContent) continue;

          // NOTE: Remove footnote from content
          content = content!.replace(fnContent, '');
        }

        // // NOTE: Remove verse number in content
        content = content!.replace(reVerseNum, '').trim();

        if (!content) continue;

        logger.info(
          `verse ${match.groups.verseNum} (${chap.book.title} ${chap.number}): ${content}`,
        );

        verses = [
          ...verses,
          {
            number: Number(match.groups?.verseNum),
            parNum: idx,
            parIdx: i,
            content: content!,
            isPoetry,
          },
        ];
      }

      return verses;
    }),
  );

  const verseInfoFlat = verseInfo.flat();

  const groupByVerseNum = lo.groupBy(verseInfoFlat, (val) => val.number);

  for (const key of Object.keys(groupByVerseNum)) {
    const data = groupByVerseNum[key]?.map((val, idx) => {
      return {
        number: val.number,
        content: val.content,
        order: idx,
        parNum: val.parNum,
        parIdx: val.parIdx,
        chapterId: chap.id,
        isPoetry: val.isPoetry,
      };
    });

    if (!data) return;

    await prisma.bookVerse.createMany({
      data,
      skipDuplicates: true,
    });
  }

  await context.close();
  await browser.close();
};

export { getVerse };
