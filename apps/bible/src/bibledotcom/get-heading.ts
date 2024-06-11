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

  // NOTE: Heading
  const paragraphs = await page
    .locator('css=[class*="ChapterContent_s" i]')
    .all();

  // NOTE: Match the chap and verse num in the class string. Ex: "GEN.2.4".
  const reClassVerse = /(?<name>\w+)\.(?<chap>\d+)\.(?<verseNum>\d+)/;

  const headingData = await Promise.all(
    paragraphs.map(async (par) => {
      const classAttr = await par.getAttribute('class');

      // NOTE: Skip if the class attribute does not contain heading class
      if (classAttr?.search(/_s.+__/) === -1) {
        return [];
      }

      let heading = await par.textContent();

      if (!heading) return [];

      heading = heading.trim();

      // NOTE: A heading always placed before the verse
      // NOTE: Because every headings have the same class name, so I have to use
      // "has-text" for the heading text to find the next verse.
      const nextVerse = page
        .locator(
          `div[class*="${classAttr}" i]:has-text("${heading}") ~ div[class*="ChapterContent_p" i]`,
        )
        // NOTE: Most of the time is p, but I have to cover other cases that
        // might be q or m. You can comment this line if you are sure that the
        // next verse is always p.
        .or(
          page.locator(
            `div[class*="${classAttr}" i]:has-text("${heading}") ~ div[class*="ChapterContent_q" i]`,
          ),
        )
        .or(
          page.locator(
            `div[class*="${classAttr}" i]:has-text("${heading}") ~ div[class*="ChapterContent_m" i]`,
          ),
        )
        .first();

      // NOTE: Only select verse has a label, because a heading usually placed
      // before the verse
      const nextVerseData = await nextVerse
        ?.locator('css=[data-usfm]:has(span[class*="ChapterContent_label" i])')
        .first()
        .getAttribute('data-usfm');

      if (!nextVerseData) return [];

      const match = nextVerseData.match(reClassVerse);

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
        'Get heading %s:%s for book %s',
        chap.number,
        verseData.number,
        chap.book.title,
      );

      logger.debug(
        'Heading %s:%s content: %s',
        chap.number,
        verseData.number,
        heading,
      );

      return [
        {
          content: heading,
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
