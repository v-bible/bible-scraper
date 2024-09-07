/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Prisma } from '@prisma/client';
import { chromium, devices } from 'playwright';
import { fetch } from 'undici';
import { bookCodeList, versionMapping } from '@/ktcgkpv/mapping';
import { logger } from '@/logger/logger';

const getParagraph = async (
  chap: Prisma.BookChapterGetPayload<{
    include: {
      book: true;
    };
  }>,
) => {
  const formdata = new FormData();
  formdata.append('version', `${versionMapping.KT2011.number}`);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  formdata.append('book', `${bookCodeList[chap.book.code]}`);
  formdata.append('book_abbr', chap.book.code);
  formdata.append('from_chapter', `${chap.number}`);
  formdata.append('to_chapter', `${chap.number}`);

  const req = await fetch('https://ktcgkpv.org/bible/content-view', {
    method: 'POST',
    body: formdata,
    redirect: 'follow',
  });

  const data = await req.json();

  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  await page.setContent(data.data.content, {
    waitUntil: 'load',
  });

  // NOTE: To check for missing verses
  let verseNumCount: string[][] = [];

  const paragraphs = await page
    .locator(
      // NOTE: We not filter empty p here because we want to report missing
      // verses
      "xpath=//p[not(starts-with(@class, 'chapter-num'))]",
    )
    .or(page.locator("p[class*='poem' i]"))
    .all();

  await Promise.all(
    paragraphs.map(async (par) => {
      let verseNumLocator = par.locator(
        "xpath=//sup[starts-with(@class, 'verse-num') or not(@class)]",
      );

      if ((await verseNumLocator.all()).length === 0) {
        logger.warn(
          `Missing verse number: chapter %s for book %s`,
          chap.number,
          chap.book.title,
        );

        verseNumLocator = par.locator(
          "xpath=//following-sibling::sup[starts-with(@class, 'verse-num')]",
        );
      }

      const verseNumText = await verseNumLocator.allTextContents();

      if (/[a-z]/.test(verseNumText.join('').toLowerCase())) {
        logger.warn(
          `Verse contains character: %s for book %s`,
          chap.number,
          chap.book.title,
        );
      }

      const newVerseNumText = verseNumText
        .map((num) => {
          if (verseNumCount.flat().includes(num) || num.trim() === '') {
            return null;
          }
          return num;
        })
        .filter((num) => num !== null)
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

      if (newVerseNumText.length === 0) {
        return;
      }

      verseNumCount = [...verseNumCount, newVerseNumText];
    }),
  );

  await context.close();
  await browser.close();

  verseNumCount = verseNumCount.sort(
    (a, b) => parseInt(a[0]!, 10) - parseInt(b[0]!, 10),
  );

  return verseNumCount;
};

export { getParagraph };
