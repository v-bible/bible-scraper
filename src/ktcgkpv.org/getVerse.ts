import { type Book, type Chapter, MarkKind } from '@prisma/client';
import { mapValues, retry } from 'es-toolkit';
import { chromium, devices } from 'playwright';
import { type FootnoteData, type VerseData } from '@/@types';
import { insertData } from '@/ktcgkpv.org/insertData';
import { versionMapping } from '@/ktcgkpv.org/mapping';
import { parseMd } from '@/lib/remark';
import { VerseProcessor, withNormalizeHeadingLevel } from '@/lib/verse-utils';

type GetVerseProps = {
  versionCode: keyof typeof versionMapping;
};

type ContentView = {
  data: {
    content: string;
    notes?: Record<string, string>;
    references?: Record<string, Record<string, string>[]>;
  };
  msg: null;
  success: boolean;
};

type ProperName = {
  english: string;
  french: string;
  latin: string;
  origin: string;
  vietnamese: string;
};

const reRefMatch = /@(?<refLabel>ci\d+\\?_[^_]+\\?_[^&]+)&\$[^$]*\$@/gmu;
const reHeadMatch = /(?<headingLevel>#+).*&&\n/gmu;

const getFootnoteData = async (
  contentViewData: ContentView,
): Promise<FootnoteData[]> => {
  const noteContentMap = await Promise.all(
    Object.entries(contentViewData.data?.notes || {}).map(
      async ([key, noteContent]) => {
        const parsedContent = await parseMd(noteContent as string);

        return {
          label: key,
          kind: MarkKind.FOOTNOTE,
          content: parsedContent,
        } satisfies FootnoteData;
      },
    ),
  );

  const refContentMap = await Promise.all(
    Object.entries(contentViewData.data?.references || {}).map(
      async ([key, refContent]) => {
        const newRefContent = (refContent as Record<string, string>[])
          ?.map((v) => v.display_text)
          .join('; ');

        return {
          label: key,
          kind: MarkKind.REFERENCE,
          content: newRefContent,
        } satisfies FootnoteData;
      },
    ),
  );

  return [...noteContentMap, ...refContentMap];
};

const properNameTemplate = (properName: ProperName) => {
  return `English: ${properName.english} | French: ${properName.french} | Latin: ${properName.latin} | Origin: ${properName.origin} | Vietnamese: ${properName.vietnamese}`.replaceAll(
    '\n',
    ' -- ',
  );
};

const getProperNameData = async (names: string[]): Promise<FootnoteData[]> => {
  const uniqueNames = [...new Set(names)];

  const properNameMap = await Promise.all(
    uniqueNames.map(async (name) => {
      const data = await retry(
        async () => {
          return (
            await fetch('https://ktcgkpv.org/bible/name-transliterate', {
              method: 'POST',
              body: new URLSearchParams({
                name,
              }).toString(),
              redirect: 'follow',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            })
          ).json();
        },
        {
          retries: 5,
        },
      );

      const cleanupData =
        (data.data?.map((properData: ProperName) =>
          mapValues(properData, (value) => value.replaceAll('<br />', '\n')),
        ) satisfies ProperName[]) || [];

      return cleanupData;
    }),
  );

  return properNameMap.flat()?.map((properName) => {
    return {
      label: properName.vietnamese,
      kind: MarkKind.FOOTNOTE,
      content: properNameTemplate(properName),
    } satisfies FootnoteData;
  });
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
  };
};

const getVerse = async (
  book: Book,
  chapter: Chapter,
  { versionCode }: GetVerseProps,
) => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  const href = `https://ktcgkpv.org/bible?version=${versionMapping[versionCode].number}`;

  await retry(
    async () => {
      await page.goto(href);
    },
    {
      retries: 5,
    },
  );

  // Open the book selection dialog
  await page.locator('button[id="bookSelection"]').click();

  // Select the book by its name
  await page
    .locator('div[id="bookSelectDialog"]')
    .locator('div[class*="modal-body"]')
    .locator('div[class*="row"]')
    .locator('button', {
      hasText: new RegExp(`^\\s*${book.name}\\s*$`),
    })
    .click();

  // Open the chapter from selection dialog
  await page.locator('button[id="btnFromChapter"]').click();

  // Select the chapter by its number
  await page
    .locator('div[id="chapterPopover"]')
    .locator('div[class*="popover-content"]')
    .locator('ul')
    .locator('li', {
      has: page.locator(`a[data-chapter="${chapter.number}"]`),
    })
    .click();

  // Open the verse to selection dialog
  await page.locator('button[id="btnToVerse"]').click();

  // Select the verse by its number
  await page
    .locator('div[id="versePopover"]')
    .locator('div[class*="popover-content"]')
    .locator('ul')
    .last()
    .locator('li')
    .last()
    .click();

  const resPromise = page.waitForResponse(
    (response) =>
      response.url() === 'https://ktcgkpv.org/bible/content-view' &&
      response.status() === 200 &&
      response.request().method() === 'POST',
  );

  // Click the View Content button to load the verse content
  await page.locator('button[id="btnViewContent"]').click();

  // Wait for the content to load, also we fetch footnote data at here also
  const response = await resPromise;

  const contentViewData = (await response.json()) as ContentView;

  await page.locator('h1', { hasText: 'HƯỚNG DẪN SỬ DỤNG' }).waitFor({
    state: 'hidden',
  });

  const allProperName = await page
    .locator("a[class*='proper-name']")
    .allTextContents();

  const footnoteData = await getFootnoteData(contentViewData);

  const properNameData = await getProperNameData(allProperName);

  const bodyContentLocator = page.locator('div[id="bibleContent"]');

  await bodyContentLocator.evaluate(() => {
    // NOTE: Remove the chapter num
    document.querySelectorAll("p[class*='chapter-num' i]").forEach((el) => {
      el.remove();
    });

    document.querySelectorAll('p').forEach((el) => {
      const className = el.getAttribute('class');

      if (className?.includes('poem')) {
        // NOTE: For poetry, we append &~ to the content so it can be parsed
        // as poetry later
        el.innerHTML = `${el.innerHTML}&~`;
      }
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

      if (!className) {
        return;
      }

      const refLabelMatch = className.match(/ci\d+_[^_]+_.+/u);

      el.innerHTML = `@${refLabelMatch?.[0]}&${el.innerHTML}@`;
    });

    // NOTE: Then we wrap it with < for every sup as footnote. So the note
    // character is <$a$>
    document.querySelectorAll('sup[class*="note" i]').forEach((el) => {
      el.innerHTML = `<${el.innerHTML}>`;
    });

    // NOTE: Because the proper will be processed as empty link so we have to
    // convert to span instead
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

  await insertData(withNormalizeHeadingLevel(verseData), book, chapter, [
    ...footnoteData,
    ...properNameData,
  ]);
};

export { getVerse };
