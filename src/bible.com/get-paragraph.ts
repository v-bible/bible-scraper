/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Prisma } from '@prisma/client';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { parseMd } from '@/lib/remark';

const getParagraph = async (
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

  await page.evaluate(() => {
    // NOTE: Remove headings
    document.querySelectorAll('[class*="ChapterContent_s" i]').forEach((el) => {
      el.remove();
    });

    // NOTE: Remove refs
    document
      .querySelectorAll('[class*="ChapterContent_r___" i]')
      .forEach((el) => {
        el.remove();
      });

    // // NOTE: Remove footnotes
    document
      .querySelectorAll('[class*="ChapterContent_note__" i]')
      .forEach((el) => {
        el.remove();
      });

    // NOTE: Add a break to differentiate between verses
    document
      .querySelectorAll('[class*="ChapterContent_verse__" i]')
      .forEach((el) => {
        el.outerHTML = `${el.outerHTML}<br>`;
      });

    // NOTE: Remove verse nums
    document
      .querySelectorAll('[class*="ChapterContent_label__" i]')
      .forEach((el) => {
        el.remove();
      });

    // NOTE: Remove psalm metadata
    document.querySelectorAll("[class*='ChapterContent_d' i]").forEach((el) => {
      el.remove();
    });

    // NOTE: Mark special word with b, and add $ so we will have a fake space
    // after that.
    document
      .querySelectorAll("[class*='ChapterContent_nd' i]")
      .forEach((el) => {
        el.innerHTML = `<b>${el.outerHTML}</b>$`;
      });

    // NOTE: Replace span wrap word of Jesus with b element
    document
      .querySelectorAll("[class*='ChapterContent_wj___' i]")
      .forEach((el) => {
        el.outerHTML = el.outerHTML.replaceAll(/(?<=<\/?)span(?=.*>)/gm, 'b');
      });
  });

  const parsedContent = await parseMd(
    await page
      .locator('css=[class*="ChapterContent_book" i] > div[data-usfm]')
      .innerHTML(),
  );

  await context.close();
  await browser.close();

  const paragraphs = parsedContent
    .split(/(?<!\\)\n/gm)
    .filter((p) => p.trim() !== '')
    .map((p, parNum) => {
      const verses = p.split(/\\\n/gm).filter((v) => v.trim() !== '');

      return verses.map((v, parIndex) => {
        return {
          // NOTE: Remove redundant special words space
          content: v
            .replaceAll(/\*\*\$/gm, '**')
            // NOTE: Duplicate word of Jesus bold
            .replaceAll(/\*\*\*\*/gm, '**')
            .trim(),
          parNum,
          parIndex,
          isChecked: false,
        };
      });
    })
    .flat();

  return paragraphs;
};

export { getParagraph };
