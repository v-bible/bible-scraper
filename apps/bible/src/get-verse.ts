/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import type { Prisma } from '@prisma/client';
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
  PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) =>
    blocker.enableBlockingInPage(page),
  );

  await page.goto(`https://www.biblegateway.com${chap.url}`);

  const paragraphs = await page
    .locator('[data-translation]')
    .getByRole('paragraph')
    .all();

  const re = /(?<name>\w+)-(?<chap>\d+)-(?<verseNum>\d+)/;

  const verseInfo = await Promise.all(
    paragraphs.map(async (par, idx) => {
      const verseCount = await par.locator('css=[class*="Gen-"]').count();

      let verses: Array<{
        bookName: string;
        bookChap: number;
        number: number;
        parNum: number;
        parIdx: number;
        content: string;
      }> = [];

      for (let i = 0; i < verseCount; i += 1) {
        const textEl = par.locator('css=[class*="Gen-"]').nth(i);

        const classAttr = await textEl.getAttribute('class');

        if (!classAttr) continue;

        const match = classAttr.match(re);

        if (!match?.groups) continue;

        let content = await textEl.textContent();

        content = content!.replace(/^\d+/, '').trim();

        logger.info(`verse ${match.groups.verseNum}: ${content}`);

        verses = [
          ...verses,
          {
            bookName: String(match.groups?.name).toLowerCase(),
            bookChap: Number(match.groups?.chap),
            number: Number(match.groups?.verseNum),
            parNum: idx,
            parIdx: i,
            content: content!,
          },
        ];
      }

      return verses;
    }),
  );

  const verseInfoFlat = verseInfo.flat();

  const groupByVerseNum = lo.groupBy(verseInfoFlat, (val) => val.number);

  Object.keys(groupByVerseNum).forEach(async (key) => {
    const data = groupByVerseNum[key]?.map((val, idx) => {
      return {
        number: val.number,
        content: val.content,
        order: idx,
        parNum: val.parNum,
        parIdx: val.parIdx,
        chapterId: chap.id,
      };
    });

    if (!data) return;

    await prisma.bookVerse.createMany({
      data,
      skipDuplicates: true,
    });
  });

  const poetryEl = await page.locator('css=[class="poetry"]').all();

  await Promise.all(
    poetryEl.map(async (val) => {
      const classAttr = await val
        .locator('css=[class*="Gen-"]')
        .first()
        .getAttribute('class');

      if (!classAttr) return;

      const match = classAttr.match(re);

      if (!match?.groups) return;

      await prisma.bookVerse.updateMany({
        where: {
          number: Number(match.groups?.verseNum),
        },
        data: {
          isPoetry: true,
        },
      });
    }),
  );

  await context.close();
  await browser.close();
};

(async () => {
  const book = await prisma.book.findFirstOrThrow({
    where: {
      code: 'gen',
    },
  });

  const chap = await prisma.bookChapter.findUniqueOrThrow({
    where: {
      number_bookId: {
        number: 2,
        bookId: book.id,
      },
    },
    include: {
      book: true,
    },
  });

  await getVerse(chap);
})();

export { getVerse };
