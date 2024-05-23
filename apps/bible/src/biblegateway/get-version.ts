/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import retry from 'async-retry';
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
    .getByRole('row')
    .filter({ hasNot: page.locator('css=th') })
    .all();

  // NOTE: The versionCode is the part inside the parentheses
  const reVersionCode = /\(([\w|-]+)\)/;

  for (const row of versions) {
    const langCode = await row.getAttribute('data-language');
    let langName: string | null = null;

    if ((await row.locator('css=[data-target]').count()) > 0) {
      langName = await row.locator('css=[data-target]').innerText();
    }

    if (!langCode) {
      continue;
    }

    if (langName) {
      await prisma.versionLanguage.upsert({
        where: {
          code: langCode,
        },
        update: {
          code: langCode,
          name: langName,
        },
        create: {
          code: langCode,
          name: langName,
        },
      });
    }

    const colVersion = row.locator('css=[data-translation]');

    const versionName = await colVersion.textContent();

    const versionCode = versionName?.match(reVersionCode)?.[1];

    const colFormat = row.getByRole('cell').last();
    const colFormatText = (await colFormat.textContent())?.toLowerCase();

    // REVIEW: Currently, we gonna skip the row if the row doesn't have a versionCode
    if (!versionCode || !versionName) {
      continue;
    }

    const onlyNT = colFormatText?.includes('nt') || false;
    const onlyOT = colFormatText?.includes('ot') || false;
    const withApocrypha = colFormatText?.includes('apocrypha') || false;

    const version = await prisma.version.upsert({
      where: {
        code: versionCode,
      },
      update: {
        code: versionCode,
        name: versionName,
        language: {
          connect: {
            code: langCode,
          },
        },
        onlyNT,
        onlyOT,
        withApocrypha,
      },
      create: {
        code: versionCode,
        name: versionName,
        language: {
          connect: {
            code: langCode,
          },
        },
        onlyNT,
        onlyOT,
        withApocrypha,
      },
    });

    const formats: {
      type: string;
      url: string;
    }[] = [];

    if ((await colVersion.getByRole('link').count()) > 0) {
      const bookUrl = await colVersion.getByRole('link').getAttribute('href');

      if (bookUrl) {
        formats.push({
          type: 'ebook',
          url: bookUrl,
        });
      }
    }

    if (
      versionName.toLowerCase() !== colFormatText &&
      (await colFormat.getByRole('link').count()) > 0
    ) {
      const url = await colFormat.getByRole('link').getAttribute('href');
      let type = null;

      if (colFormatText?.includes('audio')) {
        type = 'audio';
      } else if (colFormatText?.includes('pdf')) {
        type = 'pdf';
      } else {
        type = 'other';
      }

      if (url) {
        formats.push({
          type,
          url,
        });
      }
    }

    for (const format of formats) {
      await prisma.versionFormat.upsert({
        where: {
          versionId: version.id,
          type_url: {
            type: format.type,
            url: format.url,
          },
        },
        update: {
          type: format.type,
          url: format.url,
          version: {
            connect: {
              code: versionCode,
            },
          },
        },
        create: {
          type: format.type,
          url: format.url,
          version: {
            connect: {
              code: versionCode,
            },
          },
        },
      });

      logger.info(`getting format: ${format.type} for version: ${versionName}`);
    }
  }

  await context.close();
  await browser.close();
};

export { getVersion };
