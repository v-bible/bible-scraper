/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
// import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { versionMapping } from '@/ktcgkpv/mapping';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

const getBook = async (versionCode: keyof typeof versionMapping = 'KT2011') => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Ad-blocker
  // const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  // await blocker.enableBlockingInPage(page);

  const langData = await prisma.versionLanguage.upsert({
    where: {
      code_webOrigin: {
        code: 'vi',
        webOrigin: 'https://ktcgkpv.org/',
      },
    },
    update: {
      code: 'vi',
      name: 'Tiếng Việt',
      webOrigin: 'https://ktcgkpv.org/',
    },
    create: {
      code: 'vi',
      name: 'Tiếng Việt',
      webOrigin: 'https://ktcgkpv.org/',
    },
  });

  const version = await prisma.version.upsert({
    where: {
      code_languageId: {
        code: versionCode,
        languageId: langData.id,
      },
    },
    update: {
      code: versionCode.toUpperCase(),
      name: versionMapping[versionCode].title,
      onlyNT: false,
      onlyOT: false,
      withApocrypha: false,
    },
    create: {
      code: versionCode.toUpperCase(),
      name: versionMapping[versionCode].title,
      onlyNT: false,
      onlyOT: false,
      withApocrypha: false,
      language: {
        connect: {
          id: langData.id,
        },
      },
    },
  });

  await prisma.versionFormat.upsert({
    where: {
      type_ref: {
        type: 'ebook',
        ref: `https://ktcgkpv.org/bible?version=${versionMapping[versionCode].number}`,
      },
    },
    create: {
      type: 'ebook',
      ref: `https://ktcgkpv.org/bible?version=${versionMapping[versionCode].number}`,
      version: {
        connect: {
          id: version.id,
        },
      },
    },
    update: {
      type: 'ebook',
      ref: `https://ktcgkpv.org/bible?version=${versionMapping[versionCode].number}`,
    },
  });

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

  const chapterTemplate = await page
    .locator("[id='chapterPopover'] > ul > li")
    .all();

  const chapterMap: { [x: string]: string[] } = {};

  await Promise.all(
    chapterTemplate.map(async (chapterEl) => {
      const classNames = await chapterEl.getAttribute('class');

      const chapterNum = await chapterEl
        .locator('a')
        .getAttribute('data-chapter');

      if (!classNames || !chapterNum) {
        return;
      }

      const bookList = classNames
        .split(' ')
        .map((cn) => cn.replace('book', ''));

      chapterMap[chapterNum] = bookList;
    }),
  );

  // NOTE: Keep track of NT book number, the rest are OT
  let ntBookNum: number[] = [];

  const ntBookElList = await page
    .locator('[id="bookSelectDialog"]')
    // NOTE: We select that HAS CHILD contains text 'Tân Ước'
    .locator("xpath=//div[@class = 'row' and .//*[text() = 'Tân Ước']]")
    // NOTE: Then select books, we can append to previous locator put it will be too long
    .locator(
      "xpath=/following-sibling::*//button[@data-book-id and not(@data-book-isintro = '1')]",
    )
    .all();

  await Promise.all(
    ntBookElList.map(async (book) => {
      const bookId = await book.getAttribute('data-book-id');

      const bookOrder = await book
        .locator('xpath=/preceding-sibling::span[not(sub/i)]')
        .textContent();
      const bookCode = await book.getAttribute('data-book-abbr');
      let bookTitle = await book.textContent();

      if (!bookId || !bookOrder || !bookCode || !bookTitle) {
        return;
      }
      bookTitle = bookTitle?.trim();

      ntBookNum = [...ntBookNum, parseInt(bookOrder, 10)];

      const bookChapters = Object.keys(chapterMap).filter((chapterNum) =>
        chapterMap[chapterNum]?.includes(bookId),
      );

      const newBook = await prisma.book.upsert({
        where: {
          code_versionId: {
            code: bookCode.toLowerCase(),
            versionId: version.id,
          },
        },
        update: {
          code: bookCode.toLowerCase(),
          title: bookTitle,
          canon: 'nt',
          order: parseInt(bookOrder, 10),
        },
        create: {
          code: bookCode.toLowerCase(),
          title: bookTitle,
          canon: 'nt',
          order: parseInt(bookOrder, 10),
          version: {
            connect: {
              id: version.id,
            },
          },
        },
      });

      await Promise.all(
        bookChapters.map(async (chap) => {
          await prisma.bookChapter.upsert({
            where: {
              number_bookId: {
                number: parseInt(chap, 10),
                bookId: newBook.id,
              },
            },
            update: {
              number: parseInt(chap, 10),
              ref: '',
            },
            create: {
              number: parseInt(chap, 10),
              ref: '',
              book: {
                connect: {
                  id: newBook.id,
                },
              },
            },
          });
        }),
      );

      logger.info('Get chapters for book %s', bookTitle);
    }),
  );

  const otBookElList = await page
    .locator('[id="bookSelectDialog"]')
    .locator("xpath=//button[@data-book-id and not(@data-book-isintro = '1')]")
    .all();

  await Promise.all(
    otBookElList.map(async (book) => {
      const bookId = await book.getAttribute('data-book-id');

      const bookOrder = await book
        .locator('xpath=/preceding-sibling::span[not(sub/i)]')
        .textContent();
      const bookCode = await book.getAttribute('data-book-abbr');
      let bookTitle = await book.textContent();

      if (!bookId || !bookOrder || !bookCode || !bookTitle) {
        return;
      }
      bookTitle = bookTitle?.trim();

      const isOt = !ntBookNum.includes(parseInt(bookOrder, 10));

      if (!isOt) {
        return;
      }

      const bookChapters = Object.keys(chapterMap).filter((chapterNum) =>
        chapterMap[chapterNum]?.includes(bookId),
      );

      const newBook = await prisma.book.upsert({
        where: {
          code_versionId: {
            code: bookCode.toLowerCase(),
            versionId: version.id,
          },
        },
        update: {
          code: bookCode.toLowerCase(),
          title: bookTitle,
          canon: 'ot',
          order: parseInt(bookOrder, 10) - 1,
        },
        create: {
          code: bookCode.toLowerCase(),
          title: bookTitle,
          canon: 'ot',
          order: parseInt(bookOrder, 10) - 1,
          version: {
            connect: {
              id: version.id,
            },
          },
        },
      });

      await Promise.all(
        bookChapters.map(async (chap) => {
          await prisma.bookChapter.upsert({
            where: {
              number_bookId: {
                number: parseInt(chap, 10),
                bookId: newBook.id,
              },
            },
            update: {
              number: parseInt(chap, 10),
              ref: '',
            },
            create: {
              number: parseInt(chap, 10),
              ref: '',
              book: {
                connect: {
                  id: newBook.id,
                },
              },
            },
          });
        }),
      );

      logger.info('Get chapters for book %s', bookTitle);
    }),
  );

  await context.close();
  await browser.close();
};

export { getBook };
