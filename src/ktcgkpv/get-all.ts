/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Prisma } from '@prisma/client';
import { chromium, devices } from 'playwright';
import { fetch } from 'undici';
import { getParagraph } from '@/ktcgkpv/get-paragraph';
import { getVerse } from '@/ktcgkpv/get-verse';
import { insertData } from '@/ktcgkpv/insert-data';
import { bookCodeList, versionMapping } from '@/ktcgkpv/mapping';
import { parseMd } from '@/lib/remark';

export type ContentView = {
  data: {
    content: string;
    notes?: Record<string, string>;
    references?: Record<string, Record<string, string>[]>;
  };
  msg: null;
  success: boolean;
};

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
    // @ts-ignore
    body: formdata,
    redirect: 'follow',
  });

  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  const data = (await req.json()) as ContentView;

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
  const verseData = await Promise.all(
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
        // @ts-ignore
        body: verseFormData,
        redirect: 'follow',
      });

      const verseContent = (await verReq.json()) as ContentView;

      return getVerse(verseContent.data.content);
    }),
  );

  const paragraphData = await getParagraph(chap);

  const footnoteContentMap = await Promise.all(
    Object.entries(data.data?.notes || {}).map(
      async ([key, noteContent], order) => {
        const parsedContent = await parseMd(noteContent);

        return {
          label: key,
          order,
          content: parsedContent,
        };
      },
    ),
  );

  const refContentMap = await Promise.all(
    Object.entries(data.data?.references || {}).map(
      async ([key, refContent], order) => {
        const newRefContent = refContent?.map((v) => v.display_text).join('; ');

        return {
          label: key,
          order,
          content: newRefContent,
        };
      },
    ),
  );

  // NOTE: We ensure that the order of split verses like '4a', '4b', '4c' is
  // correct
  const verseOrderTrack = {
    number: 0,
    order: 0,
  };

  const verseMap = verseData
    .flat()
    .filter((v) => !!v)
    .map((verse) => {
      const parData = paragraphData.find(
        (p) => p.content === verse.verse.content,
      );

      if (!parData) {
        return null;
      }

      if (verse?.verse.number !== verseOrderTrack.number) {
        verseOrderTrack.number = verse.verse.number;
        verseOrderTrack.order = 0;
      } else {
        verseOrderTrack.order += 1;
      }

      return {
        ...verse,
        verse: {
          ...verse.verse,
          parNumber: parData.parNum,
          parIndex: parData.parIndex,
          order: verseOrderTrack.order,
        },
      };
    })
    .filter((v) => !!v);

  await insertData(verseMap, chap, footnoteContentMap, refContentMap);
};

export { getAll };
