/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Prisma } from '@prisma/client';
import { chromium, devices } from 'playwright';
import { fetch } from 'undici';
import type { ContentView } from '@/ktcgkpv/get-all';
import { versionMapping } from '@/ktcgkpv/mapping';
import { parseMd } from '@/lib/remark';

const getParagraph = async (
  chap: Prisma.BookChapterGetPayload<{
    include: {
      book: true;
    };
  }>,
  versionCode: keyof typeof versionMapping = 'KT2011',
) => {
  const req = await fetch('https://ktcgkpv.org/bible/content-view', {
    method: 'POST',
    body: new URLSearchParams({
      version: `${versionMapping[versionCode].number}`,
      book: `${versionMapping[versionCode].bookList[chap.book.code as keyof (typeof versionMapping)[typeof versionCode]['bookList']]}`,
      book_abbr: chap.book.code,
      from_chapter: `${chap.number}`,
      to_chapter: `${chap.number}`,
    }).toString(),
    redirect: 'follow',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
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

    // NOTE: Because the proper has no ref so we have to replace it with span
    // element
    document.querySelectorAll('a[class*="proper-name" i]').forEach((el) => {
      // NOTE: We replace the a element with span element, but it doesn't important
      // attributes so we don't need to copy it to new element
      const newElement = document.createElement('span');
      newElement.innerHTML = el.innerHTML;

      el.parentNode?.replaceChild(newElement, el);
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
          isChecked: false,
        };
      });
    })
    .flat();

  return paragraphs;
};

export { getParagraph };
