/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import fs from 'fs/promises';
import { PlaywrightBlocker } from '@ghostery/adblocker-playwright';
import retry from 'async-retry';
import { format, isValid, parse } from 'date-fns';
import { chromium, devices } from 'playwright';
import { CalendarEntry } from '@/catholic-resources/get-ordinary-time';

const normalizeString = (val: string) => {
  return val
    .replaceAll(/\(.*\)/g, '')
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/^x|\.$/g, '')
    .trim();
};

const getCelebration = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Ad-blocker
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  await blocker.enableBlockingInPage(page);

  await retry(
    async () => {
      await page.goto(
        'https://catholic-resources.org/Lectionary/2002USL-Sanctoral.htm',
      );
    },
    {
      retries: 5,
    },
  );

  const rows = await page.locator('tr').all();

  let res: CalendarEntry[] = [];
  for await (const row of rows) {
    const cellColor = await row.getAttribute('bgcolor');

    // NOTE: Skip header cells
    if (cellColor != null && cellColor === '#CCCCCC') {
      continue;
    }

    const col = await row.locator('td').all();

    const date = await col.at(1)?.textContent();

    const description = await col.at(2)?.textContent();

    const season = await col.at(3)?.textContent();

    const firstReading = await col.at(5)?.textContent();

    const psalm = await col.at(6)?.textContent();

    const secondReading = await col.at(7)?.textContent();

    const gospel = await col.at(9)?.textContent();

    if (
      !firstReading ||
      !psalm ||
      !secondReading ||
      !gospel ||
      !description ||
      !season ||
      !date
    ) {
      continue;
    }

    if (season.toLocaleLowerCase().includes('usa')) {
      continue;
    }

    const matches = [
      ...date
        .toLocaleLowerCase()
        .matchAll(
          /(?<isUSA>USA\s*)?(?<date>\w+\.? \d{1,2}(&\d{1,2})?)(?<isSJ>\s*-\s*SJ)?/gi,
        ),
    ];

    // eslint-disable-next-line no-loop-func
    matches.forEach((match) => {
      if (match.groups?.isSJ || match.groups?.isUSA) {
        return;
      }

      let parsedDate = parse(
        (match.groups?.date || '').replace('sept', 'sep').trim(),
        'MMM. d',
        new Date(),
      );

      if (!isValid(parsedDate)) {
        parsedDate = parse(
          (match.groups?.date || '').trim(),
          'MMMM d',
          new Date(),
        );
      }

      const weekdayType = isValid(parsedDate)
        ? format(parsedDate, 'dd/MM')
        : '';

      res = [
        ...res,
        {
          firstReading: normalizeString(firstReading),
          psalm: normalizeString(psalm),
          secondReading: normalizeString(secondReading),
          gospel: normalizeString(gospel),
          yearCycle: '',
          yearNumber: '',
          season: normalizeString(season)
            .toLocaleLowerCase()
            .replaceAll('mem', 'memorial'),
          weekdayType,
          weekOrder: '',
          periodOfDay: '',
          description: normalizeString(description),
        },
      ];
    });
  }

  res = res.filter((d) => {
    return d.firstReading && d.gospel;
  });

  fs.writeFile('celebration.json', JSON.stringify(res, null, 2));

  await context.close();
  await browser.close();
};

getCelebration();

export { getCelebration };
