/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
// import { PlaywrightBlocker } from '@ghostery/adblocker-playwright';
import type { BookVerse, Prisma } from '@prisma/client';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { getParagraph } from '@/bible.com/get-paragraph';
import { insertData } from '@/bible.com/insert-data';
import { extractVerseNum } from '@/biblegateway.com/get-all';
import { parseMd } from '@/lib/remark';
import {
  VerseProcessor,
  reVerseNumMatch,
  withNormalizeHeadingLevel,
} from '@/lib/verse-utils';

const getAll = async (
  chap: Prisma.BookChapterGetPayload<{
    include: {
      book: true;
    };
  }>,
) => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Ad-blocker
  // const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  // await blocker.enableBlockingInPage(page);

  await retry(
    async () => {
      await page.goto(chap.ref, {
        timeout: 36000, // In milliseconds is 36 seconds
      });
    },
    {
      retries: 5,
    },
  );

  await page.evaluate(() => {
    document
      .querySelectorAll('[class*="ChapterContent_label" i]')
      .forEach((el) => {
        el.innerHTML = `$${el.innerHTML}$`;
      });

    document
      .querySelectorAll('[class*="ChapterContent_r___" i]')
      .forEach((el) => {
        el.innerHTML = `@$${el.innerHTML}$@`;
      });

    document
      .querySelectorAll('[class*="ChapterContent_note" i]')
      .forEach((el) => {
        el.querySelectorAll('[class*="ChapterContent_label" i]').forEach((e) =>
          e.remove(),
        );

        el.innerHTML = `<$${el.innerHTML}$>`;
      });

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

      el.innerHTML = `<h${level}>${el.innerHTML}</h${level}>`;
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

  const versesEl = await page
    .locator('css=[class*="ChapterContent_book" i] > div[data-usfm]')
    .locator('css=[data-usfm]')
    .all();

  await Promise.all(
    versesEl.map(async (verse) => {
      const parentPoetry = await verse
        .locator('xpath=//parent::div[contains(@class, "ChapterContent_q")]')
        .all();

      const isPoetry = parentPoetry.length > 0;

      await verse.evaluate(
        (node, { isPoetry: poetry }) => {
          if (node.textContent?.search(/\$\d+\$/) === -1) {
            const className = node.getAttribute('data-usfm');

            // NOTE: Match the chap and verse num in the class string. Ex: "GEN.2.4".
            const reClassVerse = /(?<name>\w+)\.(?<chap>\d+)\.(?<verseNum>\d+)/;

            const match = className?.match(reClassVerse);

            if (!match?.groups) {
              return;
            }

            const verseNum = parseInt(match.groups.verseNum!, 10);

            node.innerHTML = `$${verseNum}$${node.innerHTML}`;
          }

          if (poetry) {
            node.innerHTML = `~${node.innerHTML}`;
          }

          // NOTE: This is the important part, so we still can differentiate even if
          // the content is not within the p element (missing verse)
          // NOTE: With parseMd, p will add break rather than the "\n".
          node.outerHTML = `<p>${node.outerHTML}</p>`;
        },
        { isPoetry },
      );
    }),
  );

  const processor = new VerseProcessor({
    reRef: /@\$(?<refLabel>[^@]*)\$@/gu,
  });

  let bodyContent = await page
    .locator('css=[class*="ChapterContent_book" i] > div[data-usfm]')
    .innerHTML();

  await context.close();
  await browser.close();

  bodyContent = await parseMd(bodyContent);

  if (!bodyContent) {
    return;
  }

  // NOTE: We add "|@" because some cases ref is among headings
  const verses = bodyContent
    // NOTE: Remove the "fake" space after special word (like "CHÚA") as
    // mentioned above
    .replaceAll(/\*\*\$/gm, '**')
    // NOTE: Remove incorrect verse num that has poetry characters
    ?.replaceAll(new RegExp(`^(\\\\~)?${reVerseNumMatch.source}$`, 'gmu'), '')
    // NOTE: Split paragraph, but we don't want cross references (right before
    // the verse) as new paragraph, also headings should be considered as new
    // paragraph
    .split(/(?<!^(#|@).*\s*)\\?\n/gm)
    .filter((val) => !!val && val.trim() !== '');

  // NOTE: We ensure that the order of split verses like '4a', '4b', '4c' is
  // correct
  const verseOrderTrack = {
    number: 0,
    order: 0,
  };

  const paragraphData = await getParagraph(chap);

  const verseMap = verses
    .map((verse) => {
      const verseNum = extractVerseNum(verse, reVerseNumMatch);

      const processedVerse = processor.processVerse(verse);

      const parData = paragraphData.find(
        (p) => p.content === processedVerse.content && !p.isChecked,
      );

      if (verseNum === null || !parData) {
        return null;
      }

      parData.isChecked = true;

      if (verseNum !== verseOrderTrack.number) {
        verseOrderTrack.number = verseNum;
        verseOrderTrack.order = 0;
      } else {
        verseOrderTrack.order += 1;
      }

      return {
        verse: {
          ...processedVerse,
          number: verseNum,
          order: verseOrderTrack.order,
          parNumber: parData.parNum,
          parIndex: parData.parIndex,
        } satisfies Pick<
          BookVerse,
          'content' | 'number' | 'order' | 'isPoetry' | 'parNumber' | 'parIndex'
        >,
        headings: processor.processHeading(verse),
        footnotes: processor.processVerseFn(verse),
        references: processor.processVerseRef(verse),
      };
    })
    .filter((v) => !!v);

  await insertData(withNormalizeHeadingLevel(verseMap), chap);
};

export { getAll };
