/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Prisma } from '@prisma/client';
import { chromium, devices } from 'playwright';
import { fetch } from 'undici';
import type { ContentView } from '@/ktcgkpv/get-all';
import { bookCodeList, versionMapping } from '@/ktcgkpv/mapping';
import { parseMd } from '@/lib/remark';

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
    // @ts-ignore
    body: formdata,
    redirect: 'follow',
  });

  const data = (await req.json()) as ContentView;

  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  await page.setContent(data.data.content, {
    waitUntil: 'load',
  });

  await page.evaluate(() => {
    document.querySelectorAll("p[class*='chapter-num' i]").forEach((el) => {
      el.remove();
    });

    // NOTE: Add a break to differentiate between verses
    document.querySelectorAll("sup[class*='verse-num' i]").forEach((el) => {
      el.outerHTML = `${el.outerHTML}<br>`;
    });

    // NOTE: Because it has a space before every footnotes. About ref it is put
    // before words so we don't have to remove it
    document.querySelectorAll('sup[class*="note" i]').forEach((el) => {
      el.outerHTML = `$${el.outerHTML}`;
    });

    document.querySelectorAll('sup').forEach((el) => {
      el.remove();
    });

    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
      el.remove();
    });
  });

  const parsedContent = await parseMd(await page.innerHTML('body'));

  await context.close();
  await browser.close();

  const paragraphs = parsedContent
    .split(/(?<!\\)\n/gm)
    .filter((p) => p.trim() !== '')
    .map((p, parNum) => {
      const verses = p.split(/\\\n/gm).filter((v) => v.trim() !== '');

      return verses.map((v, parIndex) => {
        return {
          // NOTE: Remove redundant footnote space
          content: v.replaceAll(/\s\$/gm, '').trim(),
          parNum,
          parIndex,
        };
      });
    })
    .flat();

  return paragraphs;
};

export { getParagraph };
