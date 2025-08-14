import { type Book, type Chapter, type Version } from '@prisma/client';
import { retry } from 'es-toolkit';
import { chromium, devices } from 'playwright';
import { type VerseData } from '@/@types';
import { insertData } from '@/bible.com/insertData';
import { parseMd } from '@/lib/remark';
import { VerseProcessor, withNormalizeHeadingLevel } from '@/lib/verse-utils';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

type GetVerseProps = {
  version: Version;
};

const reRefMatch = /@\$(?<refLabel>[^@]*)\$@/gmu;
const reHeadMatch = /(?<headingLevel>#+).*&&\n/gmu;
const rePoetryMatch = /\\?&~$/gmu;

const getVerseData = (verse: string) => {
  const processor = new VerseProcessor({
    reRef: reRefMatch,
    reHead: reHeadMatch,
    rePoetry: rePoetryMatch,
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

  const bookId = version.sourceUrl.split('/').pop()?.split('-').shift();

  const href = `https://www.bible.com/bible/${bookId}/${book.code}.${chapter.number}.${version.code}`;

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

  const bodyContentLocator = page
    .locator('div[class*="ChapterContent_book" i]')
    .locator('div[data-usfm]');

  if (book.code === 'psa') {
    const psalmMetadataLocator = await bodyContentLocator
      .locator('[class*="ChapterContent_d" i]')
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
    // NOTE: Remove the chapter num
    document
      .querySelectorAll(
        '[class*="ChapterContent_chapter" i] > [class*="ChapterContent_label" i]:first-child',
      )
      .forEach((el) => {
        el.remove();
      });

    document.querySelectorAll('[class*="ChapterContent_q" i]').forEach((el) => {
      // NOTE: For poetry, we append &~ to the content so it can be parsed
      // as poetry later
      el.innerHTML = `${el.innerHTML}&~`;
    });

    // NOTE: First we wrap it with $ for every element as verse number because
    // some sup for verse num is omitted
    document
      .querySelectorAll('[class*="ChapterContent_label" i]')
      .forEach((el) => {
        el.innerHTML = `$${el.innerHTML}$`;
      });

    // NOTE: Then we wrap it with @ for every element as reference. So the
    // reference character is @$a$@
    document
      .querySelectorAll('[class*="ChapterContent_r___" i]')
      .forEach((el) => {
        el.innerHTML = `@$${el.innerHTML}$@`;
      });

    // NOTE: Then we wrap it with <$ for every element as footnote. So the note
    // character is <$a$>
    document
      .querySelectorAll('[class*="ChapterContent_note" i]')
      .forEach((el) => {
        el.querySelectorAll('[class*="ChapterContent_label" i]').forEach((e) =>
          e.remove(),
        );

        el.innerHTML = `<$${el.innerHTML}$>`;
      });

    // NOTE: All headings will be appended with "&&", which won't be split as
    // paragraph later
    // NOTE: Wrap inner heading span with heading element
    document.querySelectorAll('[class*="ChapterContent_s" i]').forEach((el) => {
      const cn = el.getAttribute('class');
      // NOTE: Class name has syntax ChapterContent_s2__l6Ny0, so we can extract
      // the level by matching _s\d+__.
      const levelStr =
        cn
          ?.match(/_s\d+__/gm)?.[0]
          .replaceAll('_', '')
          .replace('s', '') ?? '1';
      // NOTE: We only need the number from 1 to 6.
      const level = parseInt(levelStr, 10) % 6;

      el.innerHTML = `<h${level}>${el.innerHTML}&&</h${level}>`;
    });

    // NOTE: Remove psalm metadata
    document.querySelectorAll("[class*='ChapterContent_d' i]").forEach((el) => {
      el.remove();
    });

    // NOTE: Mark special word (like "CHÚA") with b, and add $ so we will have a
    // fake space after that.
    document
      .querySelectorAll("[class*='ChapterContent_nd' i]")
      .forEach((el) => {
        el.innerHTML = `<b>${el.outerHTML}</b>$`;
      });

    // NOTE: Wrap word of Jesus with b element
    document
      .querySelectorAll("[class*='ChapterContent_wj___' i]")
      .forEach((el) => {
        el.innerHTML = `<b>${el.innerHTML}</b>`;
      });
  });

  const parsedContent = await parseMd(await bodyContentLocator.innerHTML());

  await context.close();
  await browser.close();

  const paragraphs = parsedContent
    // NOTE: Remove the "fake" space after special word (like "CHÚA") as
    // mentioned above
    .replaceAll(/\*\*\$/gm, '**')
    // NOTE: For reference that standalone, we have to swap ref -> heading
    // (optional) -> verseNum (optional) to heading (optional) -> verseNum
    // (optional) -> ref
    .replaceAll(/\n(@\$[^$]+\$@)\n\n(#.*&&\n\n)?(\$[^$]+\$)?/gmu, '\n$2$3$1')
    // NOTE: Remove redundant escaped
    .replaceAll('\\[', '')
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

  await insertData(withNormalizeHeadingLevel(verseData), book, chapter);
};

export { getVerse };
