/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import fs from 'fs/promises';
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';

const getOrdinaryTimeSunday = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Ad-blocker
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  await blocker.enableBlockingInPage(page);

  await retry(
    async () => {
      await page.goto(
        'https://catholic-resources.org/Lectionary/1998USL-OrdinaryA.htm',
      );
    },
    {
      retries: 5,
    },
  );

  const rows = await page.locator('tr').all();

  const res: Record<
    string,
    Record<'yearA' | 'yearB' | 'yearC', Record<string, string>>
  > = {};
  let count1 = 1;
  for await (const row of rows) {
    const cellColor = await row.getAttribute('bgcolor');

    // NOTE: Skip header cells
    if (cellColor != null && cellColor === '#CCCCCC') {
      continue;
    }

    const col = await row.locator('td').all();

    const firstReading = await col.at(3)?.textContent();

    const psalm = await col.at(4)?.textContent();

    const secondReading = await col.at(5)?.textContent();

    const gospel = await col.at(7)?.textContent();

    if (!firstReading || !psalm || !secondReading || !gospel) {
      continue;
    }

    res[count1] = {
      ...res[count1]!,
      yearA: {
        firstReading,
        psalm,
        secondReading,
        gospel,
      },
    };

    count1 += 1;
  }

  await retry(
    async () => {
      await page.goto(
        'https://catholic-resources.org/Lectionary/1998USL-OrdinaryB.htm',
      );
    },
    {
      retries: 5,
    },
  );

  const rowsTwo = await page.locator('tr').all();

  count1 = 1;

  for await (const row of rowsTwo) {
    const cellColor = await row.getAttribute('bgcolor');

    // NOTE: Skip header cells
    if (cellColor != null && cellColor === '#CCCCCC') {
      continue;
    }

    const col = await row.locator('td').all();

    // const day = await col.at(1)?.textContent();

    const firstReading = await col.at(3)?.textContent();

    const psalm = await col.at(4)?.textContent();

    const secondReading = await col.at(5)?.textContent();

    const gospel = await col.at(7)?.textContent();

    if (!firstReading || !psalm || !secondReading || !gospel) {
      continue;
    }

    res[count1] = {
      ...res[count1]!,
      yearB: {
        firstReading,
        psalm,
        secondReading,
        gospel,
      },
    };

    count1 += 1;
  }

  await retry(
    async () => {
      await page.goto(
        'https://catholic-resources.org/Lectionary/1998USL-OrdinaryC.htm',
      );
    },
    {
      retries: 5,
    },
  );

  const rowsThree = await page.locator('tr').all();

  count1 = 1;

  for await (const row of rowsThree) {
    const cellColor = await row.getAttribute('bgcolor');

    // NOTE: Skip header cells
    if (cellColor != null && cellColor === '#CCCCCC') {
      continue;
    }

    const col = await row.locator('td').all();

    // const day = await col.at(1)?.textContent();

    const firstReading = await col.at(3)?.textContent();

    const psalm = await col.at(4)?.textContent();

    const secondReading = await col.at(5)?.textContent();

    const gospel = await col.at(7)?.textContent();

    if (!firstReading || !psalm || !secondReading || !gospel) {
      continue;
    }

    res[count1] = {
      ...res[count1]!,
      yearC: {
        firstReading,
        psalm,
        secondReading,
        gospel,
      },
    };
    count1 += 1;
  }

  fs.writeFile('ot-sunday.json', JSON.stringify(res, null, 2));

  await context.close();
  await browser.close();
};

export { getOrdinaryTimeSunday };
