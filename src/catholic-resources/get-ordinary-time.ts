/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import fs from 'fs/promises';
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';

export const days = {
  mon: 'monday',
  tues: 'tuesday',
  wed: 'wednesday',
  thurs: 'thursday',
  fri: 'friday',
  sat: 'saturday',
  sun: 'sunday',
} as const;

export type CalendarEntry = {
  firstReading: string;
  psalm: string;
  secondReading: string;
  gospel: string;
  yearCycle: string;
  yearNumber: string;
  season: string;
  weekdayType: string;
  weekOrder: string;
  periodOfDay: string;
  description: string;
};

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

  const yearOneRows = await page.locator('tr').all();

  let res: CalendarEntry[] = [];
  let yearOneData: CalendarEntry[] = [];
  let yearTwoData: CalendarEntry[] = [];
  for await (const row of yearOneRows) {
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

    yearOneData = [
      ...yearOneData,
      {
        firstReading: firstReading1,
        psalm: psalm1,
        secondReading: '',
        gospel,
        yearCycle: '',
        yearNumber: '1',
        season: 'ot',
        weekdayType: mapWeekday,
        weekOrder: newWeekNum,
        periodOfDay: '',
        description: '',
      },
    ];
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

  const yearTwoRows = await page.locator('tr').all();

  for await (const row of yearTwoRows) {
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

    yearTwoData = [
      ...yearTwoData,
      {
        firstReading: firstReading2,
        psalm: psalm2,
        secondReading: '',
        gospel,
        yearCycle: '',
        yearNumber: '2',
        season: 'ot',
        weekdayType: mapWeekday,
        weekOrder: newWeekNum,
        periodOfDay: '',
        description: '',
      },
    ];
  }

  yearOneData.forEach((r) => {
    res = [...res, r];

    res = [
      ...res,
      yearTwoData.find(
        (r2) =>
          r2.weekOrder === r.weekOrder && r2.weekdayType === r.weekdayType,
      )!,
    ];
  });
  fs.writeFile('ot.json', JSON.stringify(res, null, 2));

  await context.close();
  await browser.close();
};

export { getOrdinaryTime };
