/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import fs from 'fs/promises';
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';

const days = {
  mon: 'monday',
  tues: 'tuesday',
  wed: 'wednesday',
  thurs: 'thursday',
  fri: 'friday',
  sat: 'saturday',
  sun: 'sunday',
} as const;

type Weekdays = (typeof days)[keyof typeof days];

const getOrdinaryTime = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Ad-blocker
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  await blocker.enableBlockingInPage(page);

  await retry(
    async () => {
      await page.goto(
        'https://catholic-resources.org/Lectionary/2002USL-Weekdays-OT-I.htm',
      );
    },
    {
      retries: 5,
    },
  );

  const rows = await page.locator('tr').all();

  const res: Record<string, Record<Weekdays, Record<string, string>>> = {};
  for await (const row of rows) {
    const cellColor = await row.getAttribute('bgcolor');

    // NOTE: Skip header cells
    if (cellColor != null && cellColor === '#CCCCCC') {
      continue;
    }

    const col = await row.locator('td').all();

    const day = await col.at(1)?.textContent();

    const firstReading1 = await col.at(2)?.textContent();

    const psalm1 = await col.at(3)?.textContent();

    const gospel = await col.at(5)?.textContent();

    if (!day || !firstReading1 || !psalm1 || !gospel) {
      continue;
    }

    const [weekNum, weekDay] = day.split(' - ');

    const newWeekNum = weekNum?.replace('Week ', '');

    if (!newWeekNum || !weekDay) {
      continue;
    }

    const mapWeekday = days[weekDay.toLowerCase() as keyof typeof days];

    // NOTE: firstReading1 adn psalm1 are first reading & psalm for year 1 respectively
    res[newWeekNum] = {
      ...res[newWeekNum]!,
      [mapWeekday]: {
        firstReading1,
        psalm1,
        gospel,
      },
    };
  }

  await retry(
    async () => {
      await page.goto(
        'https://catholic-resources.org/Lectionary/2002USL-Weekdays-OT-II.htm',
      );
    },
    {
      retries: 5,
    },
  );

  const rowsTwo = await page.locator('tr').all();

  for await (const row of rowsTwo) {
    const cellColor = await row.getAttribute('bgcolor');

    // NOTE: Skip header cells
    if (cellColor != null && cellColor === '#CCCCCC') {
      continue;
    }

    const col = await row.locator('td').all();

    const day = await col.at(1)?.textContent();

    const firstReading2 = await col.at(2)?.textContent();

    const psalm2 = await col.at(3)?.textContent();

    const gospel = await col.at(5)?.textContent();

    if (!day || !firstReading2 || !psalm2 || !gospel) {
      continue;
    }

    const [weekNum, weekDay] = day.split(' - ');

    const newWeekNum = weekNum?.replace('Week ', '');

    if (!newWeekNum || !weekDay) {
      continue;
    }

    const mapWeekday = days[weekDay.toLowerCase() as keyof typeof days];

    if (gospel !== res[newWeekNum]?.[mapWeekday]?.gospel) {
      console.log(
        'Not match',
        newWeekNum,
        mapWeekday,
        gospel,
        res[newWeekNum]?.[mapWeekday]?.gospel,
      );
    }

    res[newWeekNum] = {
      ...res[newWeekNum]!,
      [mapWeekday]: {
        ...res[newWeekNum]?.[mapWeekday],
        firstReading2,
        psalm2,
        gospel,
      },
    };
  }

  fs.writeFile('ot.json', JSON.stringify(res, null, 2));

  await context.close();
  await browser.close();
};

export { getOrdinaryTime };
