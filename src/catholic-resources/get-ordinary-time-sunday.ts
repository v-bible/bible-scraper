/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import fs from 'fs/promises';
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { CalendarEntry } from '@/catholic-resources/get-ordinary-time';

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

  const yearARows = await page.locator('tr').all();

  let res: CalendarEntry[] = [];
  let weekOrder = 1;
  for await (const row of yearARows) {
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

    res = [
      ...res,
      {
        firstReading,
        psalm,
        secondReading,
        gospel,
        yearCycle: 'A',
        yearNumber: '',
        season: 'ot',
        weekdayType: 'sunday',
        weekOrder: `${weekOrder}`,
        periodOfDay: '',
        description: '',
      },
    ];

    weekOrder += 1;
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

  const yearBRows = await page.locator('tr').all();

  weekOrder = 1;

  for await (const row of yearBRows) {
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

    res = [
      ...res,
      {
        firstReading,
        psalm,
        secondReading,
        gospel,
        yearCycle: 'B',
        yearNumber: '',
        season: 'ot',
        weekdayType: 'sunday',
        weekOrder: `${weekOrder}`,
        periodOfDay: '',
        description: '',
      },
    ];

    weekOrder += 1;
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

  const yearCRows = await page.locator('tr').all();

  weekOrder = 1;

  for await (const row of yearCRows) {
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

    res = [
      ...res,
      {
        firstReading,
        psalm,
        secondReading,
        gospel,
        yearCycle: 'C',
        yearNumber: '',
        season: 'ot',
        weekdayType: 'sunday',
        weekOrder: `${weekOrder}`,
        periodOfDay: '',
        description: '',
      },
    ];

    weekOrder += 1;
  }

  res = res.toSorted((a, b) => {
    return +a.weekOrder - +b.weekOrder;
  });

  fs.writeFile('ot-sunday.json', JSON.stringify(res, null, 2));

  await context.close();
  await browser.close();
};

export { getOrdinaryTimeSunday };
