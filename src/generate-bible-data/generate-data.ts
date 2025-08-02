/* eslint-disable no-continue */
import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type Prisma, type Verse, type Version } from '@prisma/client';

type GenerateBibleDataParams = {
  code: string;
  name: string;
  language: string;
  source: string;
};

export const presets = {
  'biblegateway.com': {
    code: 'BD2011',
    name: 'Bản Dịch 2011 (BD2011)',
    language: 'vi',
    source: 'biblegateway.com',
  },
  'bible.com': {
    code: 'BD2011',
    name: 'Kinh Thánh Tiếng Việt, Bản Dịch 2011',
    language: 'vie',
    source: 'bible.com',
  },
  'ktcgkpv.org': {
    code: 'KT2011',
    name: 'KPA : ấn bản KT 2011',
    language: 'vi',
    source: 'ktcgkpv.org',
  },
} satisfies Record<
  string,
  Pick<Version, 'code' | 'name' | 'language' | 'source'>
>;

const checkConsecutiveVerses = (
  verses: Verse[],
): {
  isConsecutive: boolean;
  missingVerses: number[];
} => {
  const missingVerses: number[] = [];
  const isConsecutive = true;

  // NOTE: Sort verses by number to ensure they are in order
  verses.sort((a, b) => a.number - b.number);

  const maxVerseNumber = verses[verses.length - 1]!.number!;

  for (let i = 1; i <= maxVerseNumber; i += 1) {
    if (!verses.some((verse) => verse.number === i)) {
      missingVerses.push(i);
    }
  }

  if (missingVerses.length > 0) {
    return { isConsecutive: false, missingVerses };
  }

  return { isConsecutive, missingVerses };
};

const generateBibleMetadata = async (
  version = presets['ktcgkpv.org'],
  baseDir = '../../dist/books/bible/versions',
) => {
  const { code, source, language, name } = version;

  const baseMetadataFolder = path.join(__dirname, baseDir);

  if (!existsSync(baseMetadataFolder)) {
    await mkdir(baseMetadataFolder, {
      recursive: true,
    });
  }

  const fileName = path.join(baseMetadataFolder, 'metadata.json');

  // Open file to read, create new file is not exists
  try {
    await readFile(fileName, 'utf-8');
  } catch (error) {
    await writeFile(fileName, '[]', 'utf-8');
  }

  const data = await readFile(fileName, 'utf-8');

  let parsedData = JSON.parse(data) as GenerateBibleDataParams[];

  const isExist =
    parsedData.find(
      (item) =>
        item.code === code &&
        item.language === language &&
        // REVIEW: Change this later
        item.source === source,
    ) !== undefined;

  if (isExist) {
    console.log('Metadata already exists');

    return;
  }

  parsedData = [
    ...parsedData,
    {
      code,
      language,
      name,
      source,
    },
  ];

  await writeFile(fileName, JSON.stringify(parsedData, null, 2), 'utf-8');
};

const generateBibleData = async (
  version = presets['ktcgkpv.org'],
  baseUrl = 'http://localhost:8081/api',
) => {
  const { code, source, language } = version;

  await generateBibleMetadata(version, '../../dist/books/bible/versions');

  const getAllBooks = await fetch(
    `${baseUrl}/v1/book?versionCode=${code}&language=${language}&source=${source}`,
  );

  const {
    books,
  }: {
    books: Prisma.BookGetPayload<{
      include: {
        chapters: true;
      };
    }>[];
  } = await getAllBooks.json();

  const baseFolder = path.join(
    __dirname,
    '../../dist/books/bible/versions/',
    source,
    code.toLocaleLowerCase(),
  );
  if (!existsSync(baseFolder)) {
    await mkdir(baseFolder, {
      recursive: true,
    });
  }

  await writeFile(
    path.join(baseFolder, 'metadata.json'),
    JSON.stringify(books, null, 2),
  );

  // eslint-disable-next-line no-restricted-syntax
  for await (const book of books) {
    // eslint-disable-next-line no-restricted-syntax
    for await (const chap of book.chapters) {
      await mkdir(path.join(baseFolder, book.code, chap.number.toString()), {
        recursive: true,
      });

      const getBookChapterText = await fetch(
        `${baseUrl}/v1/book/${book.code}/chapter/${chap.number}/text?versionCode=${code}&language=${language}&source=${source}`,
      );

      const { text } = await getBookChapterText.json();

      if (!text) {
        console.log('Error (md)', book.code, chap.number);

        continue;
      }

      await writeFile(
        path.join(
          baseFolder,
          book.code,
          chap.number.toString(),
          `${chap.number}.md`,
        ),
        text,
      );

      const getBookChapterHtml = await fetch(
        `${baseUrl}/v1/book/${book.code}/chapter/${chap.number}/html?versionCode=${code}&language=${language}&source=${source}`,
      );

      const { html } = await getBookChapterHtml.json();

      if (!html) {
        console.log('Error (html)', book.code, chap.number);

        continue;
      }

      await writeFile(
        path.join(
          baseFolder,
          book.code,
          chap.number.toString(),
          `${chap.number}.html`,
        ),
        html,
      );

      const getBookChapterJson = await fetch(
        `${baseUrl}/v1/book/${book.code}/chapter/${chap.number}?versionCode=${code}&language=${language}&source=${source}`,
      );

      let json = (await getBookChapterJson.json()) as Record<string, unknown>;

      if (!json) {
        console.log('Error (json)', book.code, chap.number);

        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { chapters, ...bookData } = book;

      json = {
        ...json,
        book: bookData,
      };

      const check = checkConsecutiveVerses(
        json.verses as Prisma.VerseGetPayload<undefined>[],
      );

      if (!check.isConsecutive) {
        console.log(
          `Missing verses in book ${book.code}, chapter ${chap.number}: ${check.missingVerses.join(', ')}`,
        );
      }

      await writeFile(
        path.join(
          baseFolder,
          book.code,
          chap.number.toString(),
          `${chap.number}.json`,
        ),
        JSON.stringify(json, null, 2),
      );

      await mkdir(path.join(__dirname, '../../dist/data/books/bible/'), {
        recursive: true,
      });

      await appendFile(
        path.join(
          __dirname,
          '../../dist/data/books/bible/',
          `${source}-${code.toLocaleLowerCase()}.jsonl`,
        ),
        `${JSON.stringify(json)}\n`,
      );
    }
  }
};

export { generateBibleMetadata, generateBibleData };
