/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Prisma } from '@prisma/client';
import { chromium, devices } from 'playwright';
import { getVerse } from '@/ktcgkpv/get-verse';
import { bookCodeList, versionMapping } from '@/ktcgkpv/mapping';

const getAll = async (
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

  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  const data = await req.json();

  await page.setContent(data.data.content, {
    waitUntil: 'load',
  });

  const allVerses = await page
    .locator("sup[class*='verse-num' i]")
    .allTextContents();

  await context.close();
  await browser.close();

  // NOTE: We will not iterate from the verseNumCount because we want to get all
  // verses
  await Promise.all(
    allVerses.map(async (verseNum) => {
      const verseFormData = new FormData();
      verseFormData.append('version', `${versionMapping.KT2011.number}`);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      verseFormData.append('book', `${bookCodeList[chap.book.code]}`);
      verseFormData.append('book_abbr', chap.book.code);
      verseFormData.append('from_chapter', `${chap.number}`);
      verseFormData.append('to_chapter', `${chap.number}`);
      verseFormData.append('from_verse', `${verseNum}`);
      verseFormData.append('to_verse', `${verseNum}`);

      const verReq = await fetch('https://ktcgkpv.org/bible/content-view', {
        method: 'POST',
        body: verseFormData,
        redirect: 'follow',
      });

      const verseContent = await verReq.json();

      await getVerse(verseContent.data.content);
    }),
  );
};

export { getAll };
