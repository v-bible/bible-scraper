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
import {
  processHeading,
  processVerse,
  processVerseFn,
  processVerseRef,
} from '@/lib/verse-utils';

const getVerse = async (
  html: string,
): Promise<
  | {
      verse: Pick<BookVerse, 'content' | 'number' | 'order' | 'isPoetry'>;
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
      el.textContent = `$${el.textContent}$`;
    });

    // NOTE: Then we wrap it with @ for every sup as reference. So the
    // reference character is @$a$@
    document.querySelectorAll('sup[class*="reference" i]').forEach((el) => {
      const className = el.getAttribute('class');

      const refLabelMatch = className?.match(/ci\d+_[^_]+_.+/u);

      el.textContent = `@${refLabelMatch?.[0]}&${el.textContent}@`;
    });

    // NOTE: Then we wrap it with < for every sup as note. So the note character is <$a$>
    document.querySelectorAll('sup[class*="note" i]').forEach((el) => {
      el.textContent = `<${el.textContent}>`;
    });

    // NOTE: Have to put after the sup because some sup is inside h1-h6
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
      el.textContent = `#${el.textContent}#`;
    });
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
          let text = node.textContent;

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
          node.textContent = `\n${text}`;
        },
        { verseNum, isPoetry },
      );
    }),
  );

  // NOTE: Some cases like <p><p><sup></sup>..., the content is not within the p
  // element but when we call textContent it still maintain correct places
  const bodyContent = await newPage.textContent('body');

  await context.close();
  await browser.close();

  if (!bodyContent) {
    return null;
  }

  const verses = bodyContent.split(/(?<!#)\n/g).filter((val) => val !== '');

  const verseMap = verses.map((verse, verseOrder) => {
    return {
      verse: {
        ...processVerse(verse),
        number: parseInt(verseNum!.replaceAll('$', ''), 10),
        order: verseOrder,
      } satisfies Pick<BookVerse, 'content' | 'number' | 'order' | 'isPoetry'>,
      headings: processHeading(verse),
      footnotes: processVerseFn(verse),
      references: processVerseRef(verse),
    };
  });

  return verseMap;
};

export { getVerse };
