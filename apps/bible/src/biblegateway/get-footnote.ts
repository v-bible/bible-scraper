/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import { Prisma } from '@prisma/client';
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
      await page.goto(chap.url, {
        timeout: 36000, // In milliseconds is 36 seconds
      });
    },
    {
      retries: 5,
    },
  );

  const footnotes = await page
    .locator('css=[class="footnotes"]')
    .getByRole('listitem')
    .all();

  // NOTE: Match the chap and verse num in the verse string in footnote. Ex: "2:4".
  const reFnVerse = /(?<chap>\d+):(?<verseNum>\d+)/;
  // NOTE: Match the verse number at the beginning of the string. Ex: "1".
  const reVerseNum = /^\d+/;
  // NOTE: Match the footnote character in the square brackets. Ex: "[a]".
  const reFootnote = /\[\w+\]/;

  await Promise.all(
    footnotes.map(async (fn, fnIdx) => {
      const fnLink = fn.getByRole('link');

      // NOTE: In case it has a span inside
      const fnContent = await fn.locator('css=span').first().textContent();

      const goToInfo = await fnLink.textContent();

      if (!goToInfo || !fnContent) {
        return;
      }

      const match = goToInfo.match(reFnVerse);

      const verses = await page
        .locator('[data-translation]')
        .getByRole('paragraph')
        .locator(
          // NOTE: We need EXACT MATCH, so don't use "class*=" here.
          `css=[class~="${chap.book.code}-${match?.groups!.chap}-${match?.groups!.verseNum}" i]`,
        )
        .all();

      const fnData = await Promise.all(
        verses.map(async (el, verseIdx) => {
          let content = await el.textContent();

          // NOTE: Remove verse number in content
          content = content!.replace(reVerseNum, '').trim();

          const verseData = await prisma.bookVerse.findFirstOrThrow({
            where: {
              number: Number(match?.groups!.verseNum),
              order: verseIdx,
              chapterId: chap.id,
            },
          });

          const fnPos = content.search(reFootnote);

          if (fnPos === -1) {
            return [];
          }

          logger.info(
            'Get footnote %s:%s for book %s',
            chap.number,
            verseData.number,
            chap.book.title,
          );

          logger.debug(
            'Footnote %s:%s content: %s',
            chap.number,
            verseData.number,
            fnContent,
          );

          return [
            {
              content: fnContent,
              order: fnIdx,
              verseId: verseData.id,
              chapterId: chap.id,
              position: fnPos,
            } satisfies Prisma.BookFootnoteCreateManyInput,
          ];
        }),
      );

      const fnDataFlat = fnData.flat();

      await prisma.bookFootnote.createMany({
        data: fnDataFlat,
        skipDuplicates: true,
      });
    }),
  );

  await context.close();
  await browser.close();
};

export { getFootnote };
