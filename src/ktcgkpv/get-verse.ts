/* eslint-disable no-use-before-define */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import type {
  BookFootnote,
  BookHeading,
  BookReference,
  BookVerse,
} from '@prisma/client';
import { chromium, devices } from 'playwright';
import { parseMd } from '@/lib/remark';
import { VerseProcessor } from '@/lib/verse-utils';

const getVerse = async (
  html: string,
): Promise<
  | {
      verse: Pick<
        BookVerse,
        'content' | 'number' | 'order' | 'isPoetry' | 'parIndex' | 'parNumber'
      >;
      headings: Array<
        Pick<BookHeading, 'content' | 'order'> & {
          footnotes: Array<Pick<BookFootnote, 'position'> & { label: string }>;
          references: Array<
            Pick<BookReference, 'position'> & { label: string }
          >;
        }
      >;
      footnotes: Array<Pick<BookFootnote, 'position'> & { label: string }>;
      references: Array<Pick<BookReference, 'position'> & { label: string }>;
    }[]
  | null
> => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);

  const newPage = await context.newPage();

  await newPage.setContent(html, {
    waitUntil: 'load',
  });

  await newPage.evaluate(() => {
    // NOTE: Remove the chapter num
    document.querySelectorAll("p[class*='chapter-num' i]").forEach((el) => {
      el.remove();
    });

    // NOTE: First we wrap it with $ for every sup as verse number because
    // some sup for verse num is omitted
    document.querySelectorAll('sup').forEach((el) => {
      el.innerHTML = `$${el.innerHTML}$`;
    });

    // NOTE: Then we wrap it with @ for every sup as reference. So the
    // reference character is @$a$@
    document.querySelectorAll('sup[class*="reference" i]').forEach((el) => {
      const className = el.getAttribute('class');

      const refLabelMatch = className?.match(/ci\d+_[^_]+_.+/u);

      el.innerHTML = `@${refLabelMatch?.[0]}&${el.innerHTML}@`;
    });

    // NOTE: Then we wrap it with < for every sup as note. So the note character is <$a$>
    document.querySelectorAll('sup[class*="note" i]').forEach((el) => {
      el.innerHTML = `<${el.innerHTML}>`;
    });

    // // NOTE: Have to put after the sup because some sup is inside h1-h6
    // document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
    //   el.innerHTML = `#${el.innerHTML}#`;
    // });
  });

  const verseNum = await newPage
    .locator("sup[class*='verse-num' i]")
    .textContent();

  const paragraphs = await newPage
    .locator(
      "xpath=//p[not(starts-with(@class, 'chapter-num')) and not(normalize-space(text()) = '')]",
    )
    .or(newPage.locator("p[class*='poem' i]"))
    .all();

  await Promise.all(
    paragraphs.map(async (par) => {
      const className = await par.getAttribute('class');

      const isPoetry = className?.includes('poem');

      // NOTE: num is the passed verseNum arg
      await par.evaluate(
        (node, { verseNum: num, isPoetry: poetry }) => {
          let text = node.innerHTML;

          if (text === null) {
            return;
          }

          // NOTE: Has a sup element but no text inside
          if (text.search(/\$\s\$/) !== -1) {
            text = text.replace('$ $', `$${num}$`);
            // NOTE: No sup element at all
          } else if (text.search(/\$\d+\$/) === -1) {
            text = `${num}${text}`;
          }

          if (poetry) {
            text = `~${text.trim()}`;
          }

          // NOTE: This is the important part, so we still can differentiate even if
          // the content is not within the p element (missing verse)
          node.innerHTML = `\n${text}`;
        },
        { verseNum, isPoetry },
      );
    }),
  );

  // NOTE: Some cases like <p><p><sup></sup>..., the content is not within the p
  // element but when we call textContent it still maintain correct places
  let bodyContent = await newPage.innerHTML('body');
  bodyContent = await parseMd(bodyContent);

  await context.close();
  await browser.close();

  if (!bodyContent) {
    return null;
  }

  const verses = bodyContent
    .split(/(?<!#.*\s*)\n/g)
    .filter((val) => val !== '');

  const verseMap = verses
    .map((verse) => {
      const processor = new VerseProcessor({});

      return {
        verse: {
          ...processor.processVerse(verse),
          number: parseInt(verseNum!.replaceAll('$', ''), 10),
          order: 0,
          parNumber: 0,
          parIndex: 0,
        },
        headings: processor.processHeading(verse),
        footnotes: processor.processVerseFn(verse),
        references: processor.processVerseRef(verse),
      };
    })
    // NOTE: We have to filter out empty content before counting order
    .filter((v) => v.verse.content !== '')
    .map((verseData, verseOrder) => {
      return {
        ...verseData,
        verse: {
          ...verseData.verse,
          order: verseOrder,
        },
      };
    });

  return verseMap;
};

export { getVerse };
