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

    const version = await prisma.version.upsert({
      where: {
        code: data.abbreviation.toUpperCase(),
        language: {
          webOrigin: 'https://www.bible.com',
        },
      },
      create: {
        code: data.abbreviation.toUpperCase(),
        name: `${data.title} - ${data.local_title} (${data.abbreviation.toUpperCase()})`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onlyNT: data.books.every((book: any) => book.canon === 'nt'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onlyOT: data.books.every((book: any) => book.canon === 'ot'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        withApocrypha: data.books.some((book: any) => book.canon === 'ap'),
        language: {
          connectOrCreate: {
            where: {
              code: data.language.language_tag.toLowerCase(),
              webOrigin: 'https://www.bible.com',
            },
            create: {
              code: data.language.language_tag.toLowerCase(),
              name: `${data.language.name} (${data.language.language_tag.toUpperCase()}) - ${data.language.local_name}`,
              webOrigin: 'https://www.bible.com',
            },
          },
        },
      },
      update: {
        code: data.abbreviation.toUpperCase(),
        name: `${data.title} - ${data.local_title} (${data.abbreviation.toUpperCase()})`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onlyNT: data.books.every((book: any) => book.canon === 'nt'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onlyOT: data.books.every((book: any) => book.canon === 'ot'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        withApocrypha: data.books.some((book: any) => book.canon === 'ap'),
      },
    });

    logger.info(
      `getting version ${data.title} - ${data.local_title} (${data.abbreviation.toUpperCase()})`,
    );

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

    logger.info(
      `getting format: ebook for version: ${data.title} - ${data.local_title} (${data.abbreviation.toUpperCase()})`,
    );

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

      logger.info(
        `getting format: audio for version: ${data.title} - ${data.local_title} (${data.abbreviation.toUpperCase()})`,
      );
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
