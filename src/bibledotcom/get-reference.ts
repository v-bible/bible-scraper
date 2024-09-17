/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
// import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
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

  // NOTE: Reference
  const paragraphs = await page
    .locator('css=[class*="ChapterContent_r" i]')
    .all();

  // NOTE: Match the chap and verse num in the class string. Ex: "GEN.2.4".
  const reClassVerse = /(?<name>\w+)\.(?<chap>\d+)\.(?<verseNum>\d+)/;

  const refData = await Promise.all(
    paragraphs.map(async (par) => {
      const classAttr = await par.getAttribute('class');

      // NOTE: Skip if the class attribute does not contain ref class
      if (classAttr?.search(/_r___/) === -1) {
        return [];
      }

      let refContent = await par.textContent();

      if (!refContent) return [];

      refContent = refContent.trim();

      const nextVerse = par
        .locator(`xpath=/following-sibling::div[contains(@class, '_p')]`)
        .or(
          par.locator(`xpath=/following-sibling::div[contains(@class, '_q')]`),
        )
        .or(
          par.locator(`xpath=/following-sibling::div[contains(@class, '_m')]`),
        )
        .first();

      const nextVerseData = await nextVerse
        .locator('xpath=span[not(normalize-space()="")]')
        .first()
        .getAttribute('data-usfm');

      if (!nextVerseData) return [];

      const match = nextVerseData.match(reClassVerse);

      if (!match?.groups) return [];

      const verse = await prisma.bookVerse.findFirstOrThrow({
        where: {
          number: Number(match?.groups!.verseNum),
          // NOTE: Ref always placed before the verse
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
          position: 0,
          order: 0,
          verseId: verse.id,
          chapterId: chap.id,
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
