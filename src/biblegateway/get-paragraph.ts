/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import { Prisma } from '@prisma/client';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { fetch } from 'undici';
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
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  await blocker.enableBlockingInPage(page);

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

  await context.addCookies([
    {
      name: 'BGP_pslookup_showwoj',
      value: 'yes',
      domain: '.biblegateway.com',
      path: '/',
    },
    {
      name: 'BGP_pslookup_showxrefs',
      value: 'yes',
      domain: '.biblegateway.com',
      path: '/',
    },
  ]);

  await page.evaluate(() => {
    // NOTE: Remove footnotes content after we get the content
    document
      .querySelectorAll("div[class='footnotes' i]")
      .forEach((el) => el.remove());

    document.querySelectorAll("[class*='chapternum' i]").forEach((el) => {
      el.remove();
    });

    // NOTE: Add a break to differentiate between verses
    document.querySelectorAll("span[class*='text' i]").forEach((el) => {
      el.outerHTML = `${el.outerHTML}<br>`;
    });

    document.querySelectorAll('sup').forEach((el) => {
      el.remove();
    });

    // NOTE: Then we wrap references with @$, so the character is @$a$@
    document.querySelectorAll('crossref').forEach((el) => {
      el.remove();
    });

    document.querySelectorAll("[class*='reference' i]").forEach((el) => {
      el.remove();
    });

    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
      el.remove();
    });

    document.querySelectorAll("[class*='psalm-acrostic' i]").forEach((el) => {
      el.remove();
    });

    // NOTE: Replace span wrap word of Jesus with b element
    document.querySelectorAll("[class*='woj' i]").forEach((el) => {
      el.outerHTML = el.outerHTML.replaceAll(/(?<=<\/?)span(?=.*>)/gm, 'b');
    });
  });

  const parsedContent = await parseMd(
    await page
      .locator('[data-translation]')
      .locator('[class*="passage-content" i]')
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
          content: v.trim(),
          parNum,
          parIndex,
        };
      });
    })
    .flat();

  return paragraphs;
};

export { getParagraph };
