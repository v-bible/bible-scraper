/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { writeFileSync } from 'fs';
import { PlaywrightBlocker } from '@ghostery/adblocker-playwright';
import AsyncRetry from 'async-retry';
import {
  eachDayOfInterval,
  format,
  isSunday,
  previousSunday,
  subWeeks,
} from 'date-fns';
import { groupBy } from 'es-toolkit';
import { chromium, devices } from 'playwright';
import { logger } from '@/logger/logger';
import catholicResourcesBookMapping from '@/usccb/catholic-resources-book-mapping.json';
import usccbBookMapping from '@/usccb/usccb-book-mapping.json';

type CalendarEntry = {
  firstReading: string;
  psalm: string;
  secondReading: string;
  gospel: string;
  weekday: string;
  date: string;
};

const getDailyReading = async (year: number) => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Ad-blocker
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  await blocker.enableBlockingInPage(page);

  const prevChristmasDay = new Date(year - 1, 12 - 1, 25);

  // NOTE: Advent 4 is always the Sunday before Christmas, unless Advent 4 is on
  // Dec 24th, the morning is Advent 4, and then the afternoon is Christmas
  // Eve
  const prevAdvent4 = isSunday(new Date(year - 1, 12 - 1, 24))
    ? new Date(year - 1, 12 - 1, 24)
    : previousSunday(prevChristmasDay);

  const prevAdvent1 = subWeeks(prevAdvent4, 3);

  const currChristmasDay = new Date(year, 12 - 1, 25);
  const currAdvent4 = isSunday(new Date(year, 12 - 1, 24))
    ? new Date(year, 12 - 1, 24)
    : previousSunday(currChristmasDay);
  const currAdvent1 = subWeeks(currAdvent4, 3);

  let calendar: CalendarEntry[] = [];

  for (const day of eachDayOfInterval({
    start: prevAdvent1,
    end: currAdvent1,
  })) {
    await AsyncRetry(
      async () => {
        await page.goto(
          `https://bible.usccb.org/bible/readings/${format(day, 'MMddyy')}.cfm`,
        );
      },
      {
        retries: 5,
      },
    );

    const firstReading = (
      await page
        .getByText('Reading 1', {
          exact: true,
        })
        .or(
          page.getByText('Reading I', {
            exact: true,
          }),
        )
        .locator('xpath=/following-sibling::div')
        .allTextContents()
    )
      .map((s) => s.trim())
      .join();

    const secondReading = (
      await page
        .getByText('Reading II', {
          exact: true,
        })
        .locator('xpath=/following-sibling::div')
        .allTextContents()
    )
      .map((s) => s.trim())
      .join();

    const psalm = (
      await page
        .getByText('Responsorial Psalm', {
          exact: true,
        })
        .locator('xpath=/following-sibling::div')
        .allTextContents()
    )
      .map((s) => s.trim())
      .join();

    const gospel = (
      await page
        .getByText('Gospel', {
          exact: true,
        })
        .locator('xpath=/following-sibling::div')
        .allTextContents()
    )
      .map((s) => s.trim())
      .join();

    calendar = [
      ...calendar,
      {
        firstReading: firstReading.toLowerCase(),
        psalm: psalm.toLowerCase(),
        secondReading: secondReading.toLowerCase(),
        gospel: gospel.toLowerCase(),
        weekday: format(day, 'EEEE').toLowerCase(),
        date: format(day, 'dd/MM/yyyy'),
      },
    ];

    logger.info(
      `Processed ${format(day, 'dd/MM/yyyy')}: ${firstReading}/${psalm}/${secondReading}/${gospel}`,
    );
  }

  await context.close();
  await browser.close();

  const groupedCalendar = groupBy(calendar, (d) => d.date!);

  let strRes = JSON.stringify(groupedCalendar, null, 2);

  Object.entries(usccbBookMapping).forEach(([bookName, abbr]) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (catholicResourcesBookMapping[bookName]) {
      strRes = strRes.replaceAll(
        new RegExp(`"${abbr} `, 'gi'),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        `"${catholicResourcesBookMapping[bookName]} `,
      );
    }
  });

  strRes = strRes.replaceAll(/\s?and\s?/gm, '+');

  strRes = JSON.parse(strRes);

  writeFileSync(`./calendar-${year}.json`, JSON.stringify(strRes, null, 2));
};

(async () => {
  await getDailyReading(2024);
})();
