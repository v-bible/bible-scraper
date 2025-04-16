/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import type { BookVerse, Prisma } from '@prisma/client';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { getParagraph } from '@/biblegateway/get-paragraph';
import { insertData } from '@/biblegateway/insert-data';
import { parseMd } from '@/lib/remark';
import {
  VerseProcessor,
  reVerseNumMatch,
  withNormalizeHeadingLevel,
} from '@/lib/verse-utils';

// NOTE: Match the chap and verse num in the class string. Ex: "Gen-2-4".
const reClassVerse = /(?<name>\w+)-(?<chap>\d+)-(?<verseNum>\d+)/;

export const extractVerseNum = (str: string, regex = reClassVerse) => {
  const match = regex.exec(str);

  if (!match?.groups) {
    return null;
  }

  const verseNum = parseInt(match.groups.verseNum!, 10);

  return verseNum;
};

// NOTE: This function doesn't fetch psalm metadata
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
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  await blocker.enableBlockingInPage(page);

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

  await context.addCookies([
    {
      name: 'BGP_pslookup_showwoj',
      value: 'yes',
      domain: '.biblegateway.com',
      path: '/',
    },
    {
      name: 'BGP_pslookup_showxrefs',
      value: 'yes',
      domain: '.biblegateway.com',
      path: '/',
    },
  ]);

  const fnEl = await page
    .locator("div[class='footnotes']")
    .locator('ol')
    .locator('li')
    .all();

  const fnMap = await Promise.all(
    fnEl.map(async (el, idx) => {
      const fnId = await el.getAttribute('id');

      let fnContent = await el
        .locator('span[class*="footnote-text" i]')
        .innerHTML();

      fnContent = await parseMd(fnContent);

      if (!fnId || !fnContent) {
        return null;
      }

      return {
        label: `[${fnId?.at(-1)}]`,
        order: idx,
        content: fnContent.trim(),
      };
    }),
  );

  await page.evaluate(() => {
    // NOTE: Remove footnotes content after we get the content
    document
      .querySelectorAll("div[class='footnotes' i]")
      .forEach((el) => el.remove());

    document.querySelectorAll("[class*='chapternum' i]").forEach((el) => {
      el.innerHTML = `$1$`;
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

    document.querySelectorAll("[class*='psalm-acrostic' i]").forEach((el) => {
      el.remove();
    });

    // NOTE: Replace span wrap word of Jesus with b element
    document.querySelectorAll("[class*='woj' i]").forEach((el) => {
      el.outerHTML = el.outerHTML.replaceAll(/(?<=<\/?)span(?=.*>)/gm, 'b');
    });
  });

  const paragraphs = await page
    .locator('[data-translation]')
    .locator('p')
    .all();

  await Promise.all(
    paragraphs.map(async (par) => {
      // NOTE: The book code is not case sensitive
      // Ref: https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors#attr_operator_value_i
      const verseLocator = par.locator(`span[class*="${chap.book.code}-" i]`);

      const parentPoetry = await par
        .locator("xpath=//parent::div[starts-with(@class, 'poetry')]")
        .all();

      const isPoetry = parentPoetry.length > 0;

      await verseLocator.evaluateAll(
        // eslint-disable-next-line no-shadow
        (nodes, { isPoetry: poetry }) => {
          nodes.forEach((node) => {
            if (node.textContent?.search(/\$\d+\$/) === -1) {
              const className = node.getAttribute('class');

              const match = className?.match(
                /(?<name>\w+)-(?<chap>\d+)-(?<verseNum>\d+)/,
              );

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
            node.innerHTML = `<p>${node.innerHTML}</p>`;
          });
        },
        { isPoetry },
      );
    }),
  );

  const processor = new VerseProcessor({
    reRef: /@\$(?<refLabel>[^@]*)\$@/gu,
  });

  let bodyContent = await page
    .locator('[data-translation]')
    .locator('[class*="passage-content"]')
    .innerHTML();

  bodyContent = await parseMd(bodyContent);

  await context.close();
  await browser.close();

  if (!bodyContent) {
    return;
  }

  // NOTE: We add "|@" because some cases ref is among headings
  const verses = bodyContent
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
        (p) => p.content === processedVerse.content,
      );

      if (verseNum === null || !parData) {
        return null;
      }

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

  await insertData(withNormalizeHeadingLevel(verseMap), chap, fnMap);
};

export { getAll };
