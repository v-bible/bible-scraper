/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import type { BookVerse, Prisma } from '@prisma/client';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { VerseProcessor, reVerseNumMatch } from '@/lib/verse-utils';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

// NOTE: Match the chap and verse num in the class string. Ex: "Gen-2-4".
const reClassVerse = /(?<name>\w+)-(?<chap>\d+)-(?<verseNum>\d+)/;

const extractVerseNum = (str: string, regex = reClassVerse) => {
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

  const fnEl = await page
    .locator("div[class='footnotes']")
    .locator('ol')
    .locator('li')
    .all();
  const fnMap = await Promise.all(
    fnEl.map(async (el, idx) => {
      const fnId = await el.getAttribute('id');

      const fnContent = await el
        .locator('span[class*="footnote-text" i]')
        .textContent();

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
      el.textContent = `$1$`;
    });

    // NOTE: First we wrap it with $ for every sup as verse number because
    // some sup for verse num is omitted
    document.querySelectorAll('sup').forEach((el) => {
      el.textContent = `$${el.textContent?.trim()}$`;
    });

    // NOTE: Then we wrap references with @$, so the character is @$a$@
    document.querySelectorAll('crossref').forEach((el) => {
      el.textContent = `@$${el.textContent}$@`;
    });

    document.querySelectorAll("[class*='reference' i]").forEach((el) => {
      el.textContent = `@$${el.textContent}$@`;
    });

    // NOTE: Then we wrap references with <$, so the character is <$a$>
    document.querySelectorAll('sup[class*="note" i]').forEach((el) => {
      el.textContent = `<${el.textContent}>`;
    });

    // NOTE: Have to put after the sup because some sup is inside h1-h6
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
      const className = el.getAttribute('class');

      // NOTE: Filter out the reference and psalm metadata
      if (
        className &&
        (className.includes('reference') ||
          className.includes('psalm-acrostic'))
      ) {
        return;
      }

      el.textContent = `\n#${el.textContent}#`;
    });

    document.querySelectorAll("[class*='psalm-acrostic' i]").forEach((el) => {
      el.remove();
    });
  });

  const paragraphs = await page
    .locator('[data-translation]')
    .getByRole('paragraph')
    .all();

  let verseIdxList: {
    content: string;
    parNum: number;
    parIdx: number;
  }[] = [];

  // NOTE: We ensure that the order of split verses like '4a', '4b', '4c' is
  // correct
  const verseOrderTrack = {
    number: 0,
    order: 0,
  };

  const processor = new VerseProcessor({
    reRef: /@\$(?<refLabel>[^@]*)\$@/gu,
  });

  for await (const [parNum, par] of Object.entries(paragraphs)) {
    // NOTE: The book code is not case sensitive
    // Ref: https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors#attr_operator_value_i
    const verseLocator = par.locator(`css=[class*="${chap.book.code}-" i]`);

    const parentPoetry = await par
      .locator("xpath=//parent::div[starts-with(@class, 'poetry')]")
      .all();

    const isPoetry = parentPoetry.length > 0;

    await verseLocator.evaluateAll(
      // eslint-disable-next-line no-shadow
      (nodes, { isPoetry: poetry }) => {
        nodes.forEach((node) => {
          let text = node.textContent;

          if (text === null) {
            return;
          }

          if (text.search(/\$\d+\$/) === -1) {
            const className = node.getAttribute('class');

            const match = className?.match(
              /(?<name>\w+)-(?<chap>\d+)-(?<verseNum>\d+)/,
            );

            if (!match?.groups) {
              return;
            }

            const verseNum = parseInt(match.groups.verseNum!, 10);

            text = `$${verseNum}$${text}`;
          }

          if (poetry) {
            text = `~${text.trim()}`;
          }

          // NOTE: This is the important part, so we still can differentiate even if
          // the content is not within the p element (missing verse)
          node.textContent = `\n${text}`;
        });
      },
      { isPoetry },
    );

    const parContent = await par.textContent();

    if (!parContent) {
      continue;
    }

    const verses = parContent.split(/(?<!#)\n/g).filter((val) => val !== '');

    const verseIdx = verses.map((v, parIdx) => {
      return {
        content: processor.processVerse(v).content,
        parNum: +parNum,
        parIdx,
      };
    });

    verseIdxList = [...verseIdxList, ...verseIdx];
  }

  const bodyContent = await page
    .locator('[data-translation]')
    .locator('[class*="passage-content"]')
    .textContent();

  await context.close();
  await browser.close();

  if (!bodyContent) {
    return;
  }

  // NOTE: We add "|@" because some cases ref is among headings
  const verses = bodyContent
    .split(/(?<!#|@)\n/g)
    .filter((val) => val.trim() !== '');

  const verseMap = verses.map((verse) => {
    const verseNum = extractVerseNum(verse, reVerseNumMatch);

    const processedVerse = processor.processVerse(verse);

    const verseIdx = verseIdxList.find(
      (vIdx) => vIdx.content === processedVerse.content,
    );

    if (verseNum === null || !verseIdx) {
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
        parNumber: verseIdx.parNum,
        parIndex: verseIdx.parIdx,
      } satisfies Pick<
        BookVerse,
        'content' | 'number' | 'order' | 'isPoetry' | 'parNumber' | 'parIndex'
      >,
      headings: processor.processHeading(verse),
      footnotes: processor.processVerseFn(verse),
      references: processor.processVerseRef(verse),
    };
  });

  let refOrder = 0;

  for (const vData of verseMap) {
    if (!vData) {
      continue;
    }

    if (vData.verse.number !== verseOrderTrack.number) {
      verseOrderTrack.number = vData.verse.number;
      verseOrderTrack.order = 0;
    } else {
      verseOrderTrack.order += 1;
    }

    const newVerse = await prisma.bookVerse.upsert({
      where: {
        number_order_chapterId: {
          number: verseOrderTrack.number,
          order: verseOrderTrack.order,
          chapterId: chap.id,
        },
      },
      update: {
        number: verseOrderTrack.number,
        content: vData.verse.content,
        order: verseOrderTrack.order,
        parNumber: vData.verse.parNumber,
        parIndex: vData.verse.parIndex,
        isPoetry: vData.verse.isPoetry,
      },
      create: {
        number: verseOrderTrack.number,
        content: vData.verse.content,
        order: verseOrderTrack.order,
        parNumber: vData.verse.parNumber,
        parIndex: vData.verse.parIndex,
        isPoetry: vData.verse.isPoetry,
        chapterId: chap.id,
      },
    });

    logger.info(
      'Get verse %s:%s for book %s',
      chap.number,
      vData.verse.number,
      chap.book.title,
    );

    logger.debug(
      'Verse %s:%s content: %s',
      chap.number,
      vData.verse.number,
      vData.verse.content,
    );

    if (vData.verse.isPoetry) {
      logger.info(
        'Verse %s:%s is poetry for book %s',
        chap.number,
        vData.verse.number,
        chap.book.title,
      );
    }

    for (const vHeading of vData.headings) {
      await prisma.bookHeading.upsert({
        where: {
          order_verseId: {
            order: vHeading.order,
            verseId: newVerse.id,
          },
        },
        update: {
          order: vHeading.order,
          content: vHeading.content,
        },
        create: {
          order: vHeading.order,
          content: vHeading.content,
          verseId: newVerse.id,
          chapterId: chap.id,
        },
      });

      logger.info(
        'Get heading %s:%s for book %s',
        chap.number,
        vData.verse.number,
        chap.book.title,
      );

      logger.debug(
        'Heading %s:%s content: %s',
        chap.number,
        vData.verse.number,
        vHeading.content,
      );
    }

    for (const vFootnote of vData.footnotes) {
      const vFootnoteContent = fnMap
        .filter((fn) => fn?.label === vFootnote.label)
        .at(0)!;

      if (!vFootnoteContent) {
        continue;
      }

      // NOTE: Sometimes footnote is not present
      if (!vFootnoteContent) {
        continue;
      }

      await prisma.bookFootnote.upsert({
        where: {
          order_verseId: {
            order: vFootnoteContent.order,
            verseId: newVerse.id,
          },
        },
        update: {
          order: vFootnoteContent.order,
          content: vFootnoteContent.content,
          position: vFootnote.position,
        },
        create: {
          order: vFootnoteContent.order,
          content: vFootnoteContent.content,
          position: vFootnote.position,
          verseId: newVerse.id,
          chapterId: chap.id,
        },
      });

      logger.info(
        'Get footnote %s:%s for book %s',
        chap.number,
        vData.verse.number,
        chap.book.title,
      );

      logger.debug(
        'Footnote %s:%s content: %s',
        chap.number,
        vData.verse.number,
        vFootnoteContent.content,
      );
    }

    for (const vRef of vData.references) {
      await prisma.bookReference.upsert({
        where: {
          order_verseId: {
            order: refOrder,
            verseId: newVerse.id,
          },
        },
        update: {
          order: refOrder,
          content: vRef.label,
          position: vRef.position,
        },
        create: {
          order: refOrder,
          content: vRef.label,
          position: vRef.position,
          verseId: newVerse.id,
          chapterId: chap.id,
        },
      });

      logger.info(
        'Get reference %s:%s for book %s',
        chap.number,
        vData.verse.number,
        chap.book.title,
      );

      logger.debug(
        'Reference %s:%s content: %s',
        chap.number,
        vData.verse.number,
        vRef.label,
      );

      refOrder += 1;
    }
  }
};

export { getAll };
