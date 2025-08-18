import { PlaywrightBlocker } from '@ghostery/adblocker-playwright';
import { type Book, type Chapter, type Version } from '@prisma/client';
import { retry } from 'es-toolkit';
import { type Locator, chromium, devices } from 'playwright';
import { type VerseData } from '@/@types';
import { insertData } from '@/biblegateway.com/insertData';
import { parseMd } from '@/lib/remark';
import { VerseProcessor, withNormalizeHeadingLevel } from '@/lib/verse-utils';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

type GetVerseProps = {
  version: Version;
};

// NOTE: Match the chap and verse num in the class string. Ex: "Gen-2-4".
const reClassVerse = /(?<name>\w+)-(?<chap>\d+)-(?<verseNum>\d+)/;

const reRefMatch = /@\$(?<refLabel>[^@]*)\$@/gmu;
const reHeadMatch = /(?<headingLevel>#+).*&&\n/gmu;

export const extractVerseNum = (str: string, regex = reClassVerse) => {
  const match = regex.exec(str);

  if (!match?.groups) {
    return null;
  }

  const verseNum = parseInt(match.groups.verseNum!, 10);

  return verseNum;
};

const getFootnoteData = async (locators: Locator[]) => {
  const noteContentMap = (
    await Promise.all(
      locators.map(async (el) => {
        const fnId = await el.getAttribute('id');

        let fnContent = await el
          .locator('span[class*="footnote-text" i]')
          .innerHTML();

        fnContent = await parseMd(fnContent);

        if (!fnId || !fnContent) {
          return null;
        }

        return {
          // NOTE: Footnote id has "fvi-BD2011-21514z" or "fvi-BD2011-21520ab"
          // format
          label: `[${fnId?.split('-').pop()?.replaceAll(/\d*/gmu, '')}]`,
          type: 'footnote',
          text: fnContent.trim(),
        };
      }),
    )
  ).filter((fn) => !!fn);

  return noteContentMap;
};

const getVerseData = (verse: string) => {
  const processor = new VerseProcessor({
    reRef: reRefMatch,
    reHead: reHeadMatch,
  });

  return {
    verse: processor.processVerse(verse),
    headings: processor.processHeading(verse).map((heading) => ({
      ...heading,
      text: heading.text.replace(/&&$/gm, ''),
    })),
    footnotes: [
      ...processor.processVerseFn(verse),
      ...processor.processVerseRef(verse),
    ],
    wordsOfJesus: processor.processVerseWoj(verse),
  };
};

const getVerse = async (
  book: Book,
  chapter: Chapter,
  { version }: GetVerseProps,
) => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Ad-blocker
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  await blocker.enableBlockingInPage(page);

  await retry(
    async () => {
      await page.goto(version.sourceUrl, {
        timeout: 36000, // In milliseconds is 36 seconds
      });
    },
    {
      retries: 5,
    },
  );

  const chapterHref = await page
    .locator('table')
    .locator('tr', {
      // NOTE: Add "." to differentiate ".jonah-list" vs ".nah-list"
      has: page.locator(`[data-target*=".${book.code}-list" i]`),
    })
    .locator('td')
    .locator('a', {
      hasText: new RegExp(`^${chapter.number}$`),
    })
    .getAttribute('href');

  if (!chapterHref) {
    return;
  }

  const href = `https://www.biblegateway.com${chapterHref}`;

  await retry(
    async () => {
      await page.goto(href, {
        timeout: 36000, // In milliseconds is 36 seconds
      });
    },
    {
      retries: 5,
    },
  );

  await context.addCookies([
    // NOTE: Show word of Jesus
    {
      name: 'BGP_pslookup_showwoj',
      value: 'yes',
      domain: '.biblegateway.com',
      path: '/',
    },
    // NOTE: Show cross references
    {
      name: 'BGP_pslookup_showxrefs',
      value: 'yes',
      domain: '.biblegateway.com',
      path: '/',
    },
  ]);

  const fnLocators = await page
    .locator("div[class='footnotes']")
    .locator('ol')
    .locator('li')
    .all();

  const footnoteData = await getFootnoteData(fnLocators);

  const bodyContentLocator = page
    .locator('[data-translation]')
    .locator('[class*="passage-content"]');

  if (book.code === 'ps') {
    const psalmMetadataLocator = await bodyContentLocator
      .locator('[class*="psalm-acrostic" i]')
      .all();

    await Promise.all(
      psalmMetadataLocator.map(async (locator, idx) => {
        const psalmMetadata = await locator.textContent();

        if (psalmMetadata) {
          await prisma.psalmMetadata.upsert({
            where: {
              sortOrder_chapterId: {
                sortOrder: idx,
                chapterId: chapter.id,
              },
            },
            create: {
              text: psalmMetadata.trim(),
              sortOrder: idx,
              chapterId: chapter.id,
            },
            update: {
              text: psalmMetadata.trim(),
              sortOrder: idx,
            },
          });

          logger.info(
            'Get Psalm metadata %s for book %s',
            chapter.number,
            book.name,
          );

          logger.debug(
            'Psalm metadata %s content: %s',
            chapter.number,
            psalmMetadata.trim(),
          );
        }
      }),
    );
  }

  await bodyContentLocator.evaluate(() => {
    // NOTE: Remove footnotes content after we get the content
    document
      .querySelectorAll("div[class='footnotes' i]")
      .forEach((el) => el.remove());

    document.querySelectorAll("[class*='chapternum' i]").forEach((el) => {
      el.innerHTML = `$1$`;
    });

    document.querySelectorAll('div[class*="poetry" i] span').forEach((el) => {
      // NOTE: For poetry, we append &~ to the content so it can be parsed
      // as poetry later
      el.innerHTML = `${el.innerHTML}&~`;
    });

    // NOTE: First we wrap it with $ for every sup as verse number because
    // some sup for verse num is omitted
    document.querySelectorAll('sup').forEach((el) => {
      el.innerHTML = `$${el.textContent?.trim()}$`;
    });

    // NOTE: Then we wrap references with @$, so the character is @$a$@
    document.querySelectorAll('crossref').forEach((el) => {
      // NOTE: We don't link to ref here
      el.innerHTML = el.innerHTML.replaceAll(/(?<=<\/?)a(?=.*>)/gm, 'span');

      el.innerHTML = `@$${el.innerHTML}$@`;
    });

    document.querySelectorAll("[class*='reference' i]").forEach((el) => {
      // NOTE: We don't link to ref here
      el.innerHTML = el.innerHTML.replaceAll(/(?<=<\/?)a(?=.*>)/gm, 'span');

      el.innerHTML = `@$${el.innerHTML}$@`;
      // NOTE: In case ref is heading, so we change to span for simpler than p
      el.outerHTML = el.outerHTML.replaceAll(/(?<=<\/?)h\d+(?=.*>)/gm, 'span');
    });

    // NOTE: Then we wrap references with <$, so the character is <$a$>
    document.querySelectorAll('sup[class*="note" i]').forEach((el) => {
      el.innerHTML = `<${el.innerHTML}>`;
    });

    // NOTE: Remove psalm metadata
    document.querySelectorAll("[class*='psalm-acrostic' i]").forEach((el) => {
      el.remove();
    });

    // NOTE: Wrap word of Jesus with &$...$&
    document.querySelectorAll("[class*='woj' i]").forEach((el) => {
      el.innerHTML = `&$${el.innerHTML}$&`;
    });

    // NOTE: All headings will be appended with "&&", which won't be split as
    // paragraph later
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
      el.innerHTML += '&&';
    });
  });

  const parsedContent = await parseMd(await bodyContentLocator.innerHTML());

  await context.close();
  await browser.close();

  const paragraphs = parsedContent
    // NOTE: For reference that standalone, we have to swap ref -> heading
    // (optional) -> verseNum (optional) to heading (optional) -> verseNum
    // (optional) -> ref
    .replaceAll(/\n(@\$[^$]+\$@)\n\n(#.*&&\n\n)?(\$[^$]+\$)?/gmu, '\n$2$3$1')
    .replaceAll(/\\$/gmu, '\n')
    // NOTE: We split by paragraph but ignore headings (appended with &&)
    .split(/(?<!&&\n?)\n/gm)
    .filter((p) => p.trim() !== '');

  const verseData: VerseData[] = [];

  // NOTE: We ensure that the order of split verses like '4a', '4b', '4c' is
  // correct
  const verseOrderTrack = {
    number: 0,
    subVerseIndex: 0,
  };

  // eslint-disable-next-line no-restricted-syntax
  for await (const [index, paragraph] of paragraphs.entries()) {
    // NOTE: We split by verses using verse pattern $4$, $ $ or $3-4$
    // NOTE: Always split using non-capturing group (?:)
    const verses = paragraph.split(
      /(?<!&&\n?\n?)(?=\$(?:\d+\p{L}*| )(?:-\d+\p{L}*)?\$)/gmu,
    );

    // eslint-disable-next-line no-restricted-syntax
    for (const [verseIndex, verse] of verses.entries()) {
      const verseMap = getVerseData(verse);

      let currentVerseNumber = verseMap.verse.number;

      if (currentVerseNumber === null) {
        // NOTE: If the verse number is null, we set to current verse number
        // track
        currentVerseNumber = verseOrderTrack.number;
      }

      if (currentVerseNumber !== verseOrderTrack.number) {
        verseOrderTrack.number = currentVerseNumber;
        verseOrderTrack.subVerseIndex = 0;
      } else {
        verseOrderTrack.subVerseIndex += 1;
      }

      verseData.push({
        ...verseMap,
        verse: {
          ...verseMap.verse,
          number: verseOrderTrack.number,
          paragraphNumber: index,
          paragraphIndex: verseIndex,
          subVerseIndex: verseOrderTrack.subVerseIndex,
          label: verseMap.verse?.label || `${verseOrderTrack.number}`,
        },
      } satisfies VerseData);
    }
  }

  await insertData(
    withNormalizeHeadingLevel(verseData),
    book,
    chapter,
    footnoteData,
  );
};

export { getVerse };
