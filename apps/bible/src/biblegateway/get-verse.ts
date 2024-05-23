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
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  await blocker.enableBlockingInPage(page);

  await page.goto(`https://www.biblegateway.com${chap.url}`, {
    timeout: 36000, // In milliseconds is 36 seconds
  });

  const paragraphs = await page
    .locator('[data-translation]')
    .getByRole('paragraph')
    .all();

  // NOTE: Match the chap and verse num in the verse string. Ex: "Gen-2-4".
  const reVerse = /(?<name>\w+)-(?<chap>\d+)-(?<verseNum>\d+)/;
  // NOTE: Match the verse number at the beginning of the string. Ex: "1".
  const reVerseNum = /^\d+/;
  // NOTE: Match the footnote character in the square brackets. Ex: "[a]".
  const reFootnote = /\[\w+\]/;

  const verseInfo = await Promise.all(
    paragraphs.map(async (par, idx) => {
      // NOTE: The book code is not case sensitive
      // Ref: https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors#attr_operator_value_i
      const verseCount = await par
        .locator(`css=[class*="${chap.book.code}-" i]`)
        .count();

      let verses: Array<{
        bookName: string;
        bookChap: number;
        number: number;
        parNum: number;
        parIdx: number;
        content: string;
      }> = [];

      for (let i = 0; i < verseCount; i += 1) {
        const textEl = par
          .locator(`css=[class*="${chap.book.code}-" i]`)
          .nth(i);

        const classAttr = await textEl.getAttribute('class');

        if (!classAttr) continue;

        const match = classAttr.match(reVerse);

        if (!match?.groups) continue;

        let content = await textEl.textContent();

        // NOTE: Remove verse number in content
        content = content!.replace(reVerseNum, '').trim();

        // NOTE: Remove footnote
        content = content.replace(reFootnote, '').trim();

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

  for (const key of Object.keys(groupByVerseNum)) {
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
  }

  const poetryEl = await page.locator('css=[class="poetry"]').all();

  logger.info(`getting poetry for ${chap.book.title} ${chap.number}`);

  await Promise.all(
    poetryEl.map(async (val) => {
      const classAttr = await val
        .locator(`css=[class*="${chap.book.code}-" i]`)
        .first()
        .getAttribute('class');

      if (!classAttr) return;

      const match = classAttr.match(reVerse);

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

export { getVerse };
