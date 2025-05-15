/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Prisma } from '@prisma/client';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { fetch } from 'undici';
import { getParagraph } from '@/ktcgkpv/get-paragraph';
import { getProperName, properNameTemplate } from '@/ktcgkpv/get-proper-name';
import { getVerse } from '@/ktcgkpv/get-verse';
import { insertData } from '@/ktcgkpv/insert-data';
import { versionMapping } from '@/ktcgkpv/mapping';
import { parseMd } from '@/lib/remark';
import { withNormalizeHeadingLevel } from '@/lib/verse-utils';
import { logger } from '@/logger/logger';

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
  versionCode: keyof typeof versionMapping = 'KT2011',
) => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Special cases like from version JRAI, book "Hră phian tal dua",
  // chapter 11, verse 29 has non-breaking space character in request.
  // However, in verseNum has normal space character, so we need to replace
  // with non-breaking space character
  // NOTE: In version JRAI, book 2 Sammuel, chap 19, verse 1 has verse num "1
  // (18, 33)" or "5(4)" so we need to remove any number in parentheses

  // So instead of get data from bible/content-view, we get verses from
  // "versePopover" to avoid verse number edge cases as mentioned above
  await retry(
    async () => {
      await page.goto(
        `https://ktcgkpv.org/bible?version=${versionMapping[versionCode].number}`,
      );
    },
    {
      retries: 5,
    },
  );

  const bookNumberId =
    versionMapping[versionCode].bookList[
      chap.book
        .code as keyof (typeof versionMapping)[typeof versionCode]['bookList']
    ];

  await page.locator('button[id="bookSelection" i]').click();

  await page.locator(`button[data-book-id="${bookNumberId}" i]`).click();

  await page.locator(`button[id='btnFromChapter']`).click();

  await page
    .locator(`[id='chapterPopover'] a[data-chapter="${chap.number}"]`)
    .first()
    .click();

  const allVerses = await page
    .locator("[id='versePopover'] li")
    .allTextContents();

  // NOTE: We will not iterate from the verseNumCount because we want to get all
  // verses
  const verseData: NonNullable<Awaited<ReturnType<typeof getVerse>>> = [];

  for await (const verseNum of allVerses) {
    const verReq = await fetch('https://ktcgkpv.org/bible/content-view', {
      method: 'POST',
      body: new URLSearchParams({
        version: `${versionMapping[versionCode].number}`,
        book: `${versionMapping[versionCode].bookList[chap.book.code as keyof (typeof versionMapping)[typeof versionCode]['bookList']]}`,
        book_abbr: chap.book.code,
        from_chapter: `${chap.number}`,
        to_chapter: `${chap.number}`,
        from_verse: `${verseNum}`,
        to_verse: `${verseNum}`,
      }).toString(),
      redirect: 'follow',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const verseContent = (await verReq.json()) as ContentView;

    if (!verseContent.data?.content) {
      logger.warn(
        `No content found for ${chap.book.code} ${chap.number} ${verseNum}`,
      );

      throw new Error(
        `No content found for ${chap.book.code} ${chap.number} ${verseNum}`,
      );
    }

    const newData = await getVerse(verseContent.data.content);
    if (!newData) {
      continue;
    }

    verseData.push(...newData);
  }

  const paragraphData = await getParagraph(chap, versionCode);

  const properName = await getProperName(chap, versionCode);

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

  await context.close();
  await browser.close();

  let footnoteContentMap = await Promise.all(
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

  footnoteContentMap = [
    ...footnoteContentMap,
    ...properName.map((val, index) => {
      return {
        label: val.vietnamese.split('\n').at(0)!,
        order: footnoteContentMap.length + index,
        content: properNameTemplate(val),
      };
    }),
  ];

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
        (p) => p.content === verse.verse.content && !p.isChecked,
      );

      if (!parData) {
        return null;
      }

      parData.isChecked = true;

      if (verse?.verse.number !== verseOrderTrack.number) {
        verseOrderTrack.number = verse.verse.number;
        verseOrderTrack.order = 0;
      } else {
        verseOrderTrack.order += 1;
      }

      return {
        ...verse,
        headings: verse.headings,
        verse: {
          ...verse.verse,
          parNumber: parData.parNum,
          parIndex: parData.parIndex,
          order: verseOrderTrack.order,
        },
      };
    })
    .filter((v) => !!v);

  await insertData(
    withNormalizeHeadingLevel(verseMap),
    chap,
    footnoteContentMap,
    refContentMap,
  );
};

export { getAll };
