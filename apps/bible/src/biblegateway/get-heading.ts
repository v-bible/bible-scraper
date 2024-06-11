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
      await page.goto(chap.url, {
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
  // NOTE: Match the verse number at the beginning of the string. Ex: "1".
  const reVerseNum = /^\d+/;
  // NOTE: Match the footnote character in the square brackets. Ex: "[a]".
  const reFootnote = /\[\w+\]/;

  const headingData = await Promise.all(
    headings.map(async (el) => {
      // NOTE: In case it has a span inside
      const spanEl = el.locator('css=span').first();

      const classAttr = await spanEl.getAttribute('class');

      let content = await spanEl.textContent();

      if (!classAttr || !content) return [];

      content = content.trim();

      const match = classAttr.match(reVerse);

      if (!match?.groups) return [];

      // NOTE: Heading maybe stands before a split verse, so we can't assume
      // that the verse always has the order "0". More works indeed.
      const nextVerse = page
        .locator(
          `h3:has(span[class="${classAttr}" i]:has-text("${content}")) ~ p:has(span[class="${classAttr}" i]) > span`,
        )
        .first();

      let nextVerseContent = await nextVerse.textContent();

      // NOTE: Remove verse number in content
      nextVerseContent = nextVerseContent!.replace(reVerseNum, '').trim();

      // NOTE: Remove footnote
      nextVerseContent = nextVerseContent.replace(reFootnote, '').trim();

      const verseData = await prisma.bookVerse.findFirstOrThrow({
        where: {
          number: Number(match?.groups!.verseNum),
          content: nextVerseContent,
          chapterId: chap.id,
        },
      });

      logger.info(
        'Get heading %s:%s for book %s',
        chap.number,
        verseData.number,
        chap.book.title,
      );

      logger.debug(
        'Heading %s:%s content: %s',
        chap.number,
        verseData.number,
        content,
      );

      return [
        {
          content,
          // NOTE: Set 0 for post-processing
          order: 0,
          verseId: verseData.id,
          chapterId: chap.id,
        },
      ];
    }),
  );

  const headingDataFlat = headingData.flat();

  // NOTE: Increase the order if the verse has multiple headings
  for (let i = 1; i < headingDataFlat.length; i += 1) {
    if (headingDataFlat[i]?.verseId === headingDataFlat[i - 1]?.verseId) {
      headingDataFlat[i]!.order = headingDataFlat[i - 1]!.order + 1;
    }
  }

  await prisma.bookHeading.createMany({
    data: headingDataFlat,
    skipDuplicates: true,
  });

  await context.close();
  await browser.close();
};

export { getHeading };
