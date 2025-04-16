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

export type VData = {
  verse: Pick<
    BookVerse,
    'content' | 'number' | 'order' | 'isPoetry' | 'parIndex' | 'parNumber'
  >;
  headings: Array<
    Pick<BookHeading, 'content' | 'level' | 'order'> & {
      footnotes: Array<Pick<BookFootnote, 'position'> & { label: string }>;
      references: Array<Pick<BookReference, 'position'> & { label: string }>;
    }
  >;
  footnotes: Array<Pick<BookFootnote, 'position'> & { label: string }>;
  references: Array<Pick<BookReference, 'position'> & { label: string }>;
};

const getVerse = async (html: string): Promise<VData[] | null> => {
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

    // NOTE: Then we wrap it with < for every sup as footnote. So the note
    // character is <$a$>
    document.querySelectorAll('sup[class*="note" i]').forEach((el) => {
      el.innerHTML = `<${el.innerHTML}>`;
    });

    // NOTE: Because the proper has no ref so we have to replace it with span
    // element
    document.querySelectorAll('a[class*="proper-name" i]').forEach((el) => {
      // NOTE: We replace the a element with span element, but it doesn't important
      // attributes so we don't need to copy it to new element
      const newElement = document.createElement('span');
      // NOTE: Add <$ so it can be parsed as footnotes. But it MUST have
      // el.innerHTML because content within <$ will be deleted and not match
      // with getParagraph
      newElement.innerHTML = `${el.innerHTML}<$${el.innerHTML}$>`;

      el.parentNode?.replaceChild(newElement, el);
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

  for await (const par of paragraphs) {
    const className = await par.getAttribute('class');

    const isPoetry = className?.includes('poem');

    // NOTE: num is the passed verseNum arg
    await par.evaluate(
      (node, { verseNum: num, isPoetry: poetry }) => {
        // NOTE: Has a sup element but no text inside
        if (node.textContent?.search(/\$\s\$/) !== -1) {
          node.innerHTML = node.innerHTML.replace('$ $', `$${num}$`);
          // NOTE: No sup element at all
        } else if (node.textContent?.search(/\$\d+\$/) === -1) {
          node.innerHTML = `${num}${node.innerHTML}`;
        }

        if (poetry) {
          node.innerHTML = `~${node.innerHTML}`;
        }

        // NOTE: This is the important part, so we still can differentiate even if
        // the content is not within the p element (missing verse)
        node.innerHTML = `<p>${node.innerHTML}</p>`;
      },
      { verseNum, isPoetry },
    );
  }

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
    .split(/(?<!^#.*\s*)\\?\n/gm)
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
