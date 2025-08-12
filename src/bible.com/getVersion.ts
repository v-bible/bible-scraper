import { retry } from 'es-toolkit';
import { chromium, devices } from 'playwright';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

type VersionData = {
  language: Record<string, string>;
  audio: boolean;
  abbreviation: string;
  title: string;
  local_title: string;
  books: ({
    canon: string;
    chapters: Record<string, string>[];
  } & Record<string, string>)[];
};

const getVersionByLang = async (langCode: string) => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  await retry(
    async () => {
      await page.goto(`https://www.bible.com/languages/${langCode}`);
    },
    {
      retries: 5,
    },
  );

  const links = await page
    .locator('main')
    .locator('ul')
    .locator('li')
    .locator('a')
    .all();

  const bookLinks = (
    await Promise.all(
      links.map(async (li) => {
        const href = await li.getAttribute('href');
        return href;
      }),
    )
  ).filter((href) => href !== null);

  await context.close();
  await browser.close();

  const versionList = [];

  // eslint-disable-next-line no-restricted-syntax
  for await (const href of bookLinks) {
    const bookId = href.split('/').pop()?.split('-').shift();

    const data = (await (
      await fetch(`https://www.bible.com/api/bible/version/${bookId}`)
    ).json()) as VersionData;

    const hasAudio = data.audio;

    const versionCode = data.abbreviation.toUpperCase();

    const versionName = `${data.title} - ${data.local_title} (${data.abbreviation.toUpperCase()})`;

    const hasNewTestament = data.books.some((book) => book.canon === 'nt');

    const hasOldTestament = data.books.some((book) => book.canon === 'ot');

    const hasApocrypha = data.books.some((book) => book.canon === 'ap');

    const newVersion = await prisma.version.upsert({
      where: {
        code_language_source_formatType: {
          code: versionCode,
          language: langCode,
          source: 'bible.com',
          formatType: 'ebook',
        },
      },
      create: {
        code: versionCode,
        name: versionName,
        language: langCode,
        source: 'bible.com',
        formatType: 'ebook',
        sourceUrl: `https://www.bible.com${href}`,
        hasNewTestament,
        hasOldTestament,
        hasApocrypha,
      },
      update: {
        code: versionCode,
        name: versionName,
        language: langCode,
        source: 'bible.com',
        formatType: 'ebook',
        sourceUrl: `https://www.bible.com${href}`,
        hasNewTestament,
        hasOldTestament,
        hasApocrypha,
      },
    });

    logger.info(`Get version: ${versionCode} - ${versionName}`);

    versionList.push(newVersion);

    if (hasAudio) {
      // NOTE: We take the resource name:
      // "1069-KUD-yaubada-yana-walo-yemidi-vauvauna" from string
      // "/versions/1069-KUD-yaubada-yana-walo-yemidi-vauvauna" and attach to
      // the base audio link
      const resourceName = href.split('/').at(-1);

      const audioHref = `https://www.bible.com/audio-bible-app-versions/${resourceName}`;

      await prisma.version.upsert({
        where: {
          code_language_source_formatType: {
            code: versionCode,
            language: langCode,
            source: 'bible.com',
            formatType: 'audio',
          },
        },
        create: {
          code: versionCode,
          name: versionName,
          language: langCode,
          source: 'bible.com',
          formatType: 'audio',
          sourceUrl: audioHref,
          hasNewTestament,
          hasOldTestament,
          hasApocrypha,
        },
        update: {
          code: versionCode,
          name: versionName,
          language: langCode,
          source: 'bible.com',
          formatType: 'audio',
          sourceUrl: audioHref,
          hasNewTestament,
          hasOldTestament,
          hasApocrypha,
        },
      });

      logger.info('Get format audio for version %s', versionName);
    }
  }

  return versionList;
};

const getVersion = async () => {
  const res = await fetch('https://www.bible.com/api/bible/configuration');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as any;
  const defaultVersions = data.response.data.default_versions;

  const allVersionList = [];

  // eslint-disable-next-line no-restricted-syntax
  for await (const version of defaultVersions) {
    const newVersions = await getVersionByLang(version.language_tag);

    allVersionList.push(...newVersions);
  }

  return allVersionList;
};

export { getVersion, getVersionByLang };
