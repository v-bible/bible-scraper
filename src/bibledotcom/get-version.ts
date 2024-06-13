/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

const getVersionByLang = async (langCode: string) => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Ad-blocker
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  await blocker.enableBlockingInPage(page);

  await retry(
    async () => {
      await page.goto(`https://www.bible.com/languages/${langCode}`);
    },
    {
      retries: 5,
    },
  );

  const links = await page.getByRole('listitem').getByRole('link').all();

  const reBookId = /\/(?<bookId>\d+)/;

  for (const li of links) {
    const liHref = await li.getAttribute('href');

    if (!liHref) continue;

    const match = liHref.match(reBookId);

    const bookId = match?.groups!.bookId;

    const res = await fetch(
      `https://www.bible.com/api/bible/version/${bookId}`,
    );
    const data = await res.json();

    const hasAudio = data.audio;

    const langName = `${data.language.name} (${data.language.language_tag.toUpperCase()}) - ${data.language.local_name}`;

    const langData = await prisma.versionLanguage.upsert({
      where: {
        code_webOrigin: {
          code: data.language.language_tag.toLowerCase(),
          webOrigin: 'https://www.bible.com',
        },
      },
      update: {
        code: data.language.language_tag.toLowerCase(),
        name: langName,
        webOrigin: 'https://www.bible.com',
      },
      create: {
        code: data.language.language_tag.toLowerCase(),
        name: langName,
        webOrigin: 'https://www.bible.com',
      },
    });

    const versionName = `${data.title} - ${data.local_title} (${data.abbreviation.toUpperCase()})`;

    const version = await prisma.version.upsert({
      where: {
        code_languageId: {
          code: data.abbreviation.toUpperCase(),
          languageId: langData.id,
        },
      },
      create: {
        code: data.abbreviation.toUpperCase(),
        name: versionName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onlyNT: data.books.every((book: any) => book.canon === 'nt'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onlyOT: data.books.every((book: any) => book.canon === 'ot'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        withApocrypha: data.books.some((book: any) => book.canon === 'ap'),
        language: {
          connect: {
            id: langData.id,
          },
        },
      },
      update: {
        code: data.abbreviation.toUpperCase(),
        name: versionName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onlyNT: data.books.every((book: any) => book.canon === 'nt'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onlyOT: data.books.every((book: any) => book.canon === 'ot'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        withApocrypha: data.books.some((book: any) => book.canon === 'ap'),
      },
    });

    await prisma.versionFormat.upsert({
      where: {
        type_url: {
          type: 'ebook',
          url: `https://www.bible.com${liHref}`,
        },
      },
      create: {
        type: 'ebook',
        url: `https://www.bible.com${liHref}`,
        version: {
          connect: {
            id: version.id,
          },
        },
      },
      update: {
        type: 'ebook',
        url: `https://www.bible.com${liHref}`,
      },
    });

    logger.info('Get format %s for version %s', 'ebook', versionName);

    if (hasAudio) {
      // NOTE: We take the resource name:
      // "1069-KUD-yaubada-yana-walo-yemidi-vauvauna" from string
      // "/versions/1069-KUD-yaubada-yana-walo-yemidi-vauvauna" and attach to
      // the base audio link
      const resourceName = liHref.split('/').at(-1);

      const audioHref = `https://www.bible.com/audio-bible-app-versions/${resourceName}`;

      await prisma.versionFormat.upsert({
        where: {
          type_url: {
            type: 'audio',
            url: audioHref,
          },
        },
        create: {
          type: 'audio',
          url: audioHref,
          version: {
            connect: {
              id: version.id,
            },
          },
        },
        update: {
          type: 'audio',
          url: audioHref,
        },
      });

      logger.info('Get format %s for version %s', 'audio', versionName);
    }
  }

  await context.close();
  await browser.close();
};

const getVersion = async () => {
  const res = await fetch('https://www.bible.com/api/bible/configuration');
  const data = await res.json();
  const defaultVersions = data.response.data.default_versions;

  for (const ver of defaultVersions) {
    await getVersionByLang(ver.language_tag);
  }
};

export { getVersion, getVersionByLang };
