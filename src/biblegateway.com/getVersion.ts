import { PlaywrightBlocker } from '@ghostery/adblocker-playwright';
import { retry } from 'es-toolkit';
import { chromium, devices } from 'playwright';

import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

const getVersion = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Ad-blocker
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  await blocker.enableBlockingInPage(page);

  await retry(
    async () => {
      await page.goto('https://www.biblegateway.com/versions/');
    },
    {
      retries: 5,
    },
  );

  const versions = await page
    .locator('tr')
    .filter({ hasNot: page.locator('th') })
    .all();

  // NOTE: The versionCode is the part inside the parentheses
  const reVersionCode = /\(([\w|-]+)\)/;

  // NOTE: The first row will store the langName, for next rows which don't have
  // info about the langName, we will use the langName from the first row.
  let langName: string | null = null;

  const versionList = [];

  // eslint-disable-next-line no-restricted-syntax
  for await (const row of versions) {
    const langCode = await row.getAttribute('data-language');

    if ((await row.locator('[data-target]').count()) > 0) {
      langName = await row.locator('[data-target]').innerText();
    }

    if (!langCode || !langName) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const colVersion = row.locator('[data-translation]');

    if ((await colVersion.getByRole('link').count()) === 0) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const bookHref = await colVersion.locator('a').getAttribute('href');

    const versionName = await colVersion.textContent();

    const versionCode = versionName?.match(reVersionCode)?.[1];

    const colFormat = row.locator('td').last();
    const colFormatText = (await colFormat.textContent())?.toLowerCase();

    // REVIEW: Currently, we gonna skip the row if the row doesn't have a versionCode
    if (!versionCode || !versionName || !bookHref) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const onlyNT = colFormatText?.includes('nt') || false;
    const onlyOT = colFormatText?.includes('ot') || false;
    const hasApocrypha = colFormatText?.includes('apocrypha') || false;

    const newVersion = await prisma.version.upsert({
      where: {
        code_language_source_formatType: {
          code: versionCode,
          language: langCode,
          source: 'biblegateway.com',
          formatType: 'ebook',
        },
      },
      create: {
        code: versionCode,
        name: versionName,
        language: langCode,
        source: 'biblegateway.com',
        formatType: 'ebook',
        sourceUrl: `https://www.biblegateway.com${bookHref}`,
        hasNewTestament: !onlyOT,
        hasOldTestament: !onlyNT,
        hasApocrypha,
      },
      update: {
        code: versionCode,
        name: versionName,
        language: langCode,
        source: 'biblegateway.com',
        formatType: 'ebook',
        sourceUrl: `https://www.biblegateway.com${bookHref}`,
        hasNewTestament: !onlyOT,
        hasOldTestament: !onlyNT,
        hasApocrypha,
      },
    });

    logger.info(`Get version: ${versionCode} - ${versionName}`);

    if (colFormatText?.includes('audio')) {
      const audioHref =
        (await colFormat.locator('a').getAttribute('href')) || '';

      await prisma.version.upsert({
        where: {
          code_language_source_formatType: {
            code: versionCode,
            language: langCode,
            source: 'biblegateway.com',
            formatType: 'audio',
          },
        },
        create: {
          code: versionCode,
          name: versionName,
          language: langCode,
          source: 'biblegateway.com',
          formatType: 'audio',
          sourceUrl: `https://www.biblegateway.com${audioHref}`,
          hasNewTestament: !onlyOT,
          hasOldTestament: !onlyNT,
          hasApocrypha,
        },
        update: {
          code: versionCode,
          name: versionName,
          language: langCode,
          source: 'biblegateway.com',
          formatType: 'audio',
          sourceUrl: `https://www.biblegateway.com${audioHref}`,
          hasNewTestament: !onlyOT,
          hasOldTestament: !onlyNT,
          hasApocrypha,
        },
      });

      logger.info('Get format audio for version %s', versionName);
    }

    versionList.push(newVersion);
  }

  await context.close();
  await browser.close();

  return versionList;
};

export { getVersion };
