/* eslint-disable no-unreachable-loop */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Prisma } from '@prisma/client';
import { chromium, devices } from 'playwright';
import { fetch } from 'undici';
import { bookCodeList, versionMapping } from '@/ktcgkpv/mapping';
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

export type ProperName = {
  english: string;
  french: string;
  latin: string;
  origin: string;
  vietnamese: string;
};

const getProperName = async (
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

  const allProperName = [
    ...new Set(
      await page.locator("a[class*='proper-name' i]").allTextContents(),
    ),
  ];

  await context.close();
  await browser.close();

  let properData: ProperName[] = [];

  for await (const name of allProperName) {
    const properFormData = new FormData();
    properFormData.append('name', name);

    const properReq = await fetch(
      'https://ktcgkpv.org/bible/name-transliterate',
      {
        method: 'POST',
        // @ts-ignore
        body: properFormData,
        redirect: 'follow',
      },
    );

    try {
      const res = ((await properReq.json()) as { data: ProperName[] }).data[0]!;
      Object.keys(res).forEach((key) => {
        const typedKey = key as keyof ProperName;
        res[typedKey] = res[typedKey].replaceAll('<br />', '\n');
      });

      properData = [
        ...properData,
        {
          english: res.english,
          french: res.french,
          latin: res.latin,
          origin: res.origin,
          vietnamese: res.vietnamese,
        },
      ];
    } catch (err) {
      logger.error('Error getting proper name for %s', name);
    }

    properData = [
      ...properData,
      {
        english: '',
        french: '',
        latin: '',
        origin: '',
        vietnamese: '',
      },
    ];
  }

  logger.info('Get proper name for %s %s', chap.book.code, chap.number);

  return properData;
};

const properNameTemplate = (properName: ProperName) => {
  return `English: ${properName.english} - French: ${properName.french} - Latin: ${properName.latin} - Origin: ${properName.origin} - Vietnamese: ${properName.vietnamese}`.replaceAll(
    '\n',
    ' ',
  );
};

export { getProperName, properNameTemplate };
