import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type Prisma } from '@prisma/client';

type GenerateBibleDataParams = {
  versionCode: string;
  langCode: string;
  webOrigin: string;
  origin: string;
};

export const presets = {
  biblegateway: {
    versionCode: 'BD2011',
    langCode: 'vi',
    webOrigin: 'https://www.biblegateway.com',
    origin: 'biblegateway',
  },
  bibledotcom: {
    versionCode: 'BD2011',
    langCode: 'vie',
    webOrigin: 'https://www.bible.com',
    origin: 'bibledotcom',
  },
  ktcgkpv: {
    versionCode: 'KT2011',
    langCode: 'vi',
    webOrigin: 'https://ktcgkpv.org/',
    origin: 'ktcgkpv',
  },
} satisfies Record<string, GenerateBibleDataParams>;

const generateBibleMetadata = async (
  { versionCode, langCode, webOrigin, origin } = presets.ktcgkpv,
  baseDir = '../../dist/data/books/bible/versions/',
) => {
  const baseFolder = path.join(__dirname, baseDir);

  if (!existsSync(baseFolder)) {
    await mkdir(baseFolder, {
      recursive: true,
    });
  }

  const fileName = path.join(baseFolder, 'metadata.json');

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
        item.versionCode === versionCode &&
        item.langCode === langCode &&
        // REVIEW: Change this later
        item.origin === origin,
    ) !== undefined;

  if (isExist) {
    console.log('Metadata already exists');

    return;
  }

  parsedData = [
    ...parsedData,
    {
      versionCode,
      langCode,
      origin,
      webOrigin,
    },
  ];

  await writeFile(fileName, JSON.stringify(parsedData, null, 2), 'utf-8');
};

const generateBibleData = async (
  { versionCode, langCode, webOrigin, origin } = presets.ktcgkpv,
  baseUrl = 'http://localhost:8081/api',
) => {
  await generateBibleMetadata(
    {
      versionCode,
      langCode,
      webOrigin,
      origin,
    },
    '../../dist/data/books/bible/versions/',
  );

  const getAllBooks = await fetch(
    `${baseUrl}/v1/book?versionCode=${versionCode}&langCode=${langCode}&webOrigin=${webOrigin}`,
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
    '../../dist/data/books/bible/versions/',
    origin,
    versionCode.toLocaleLowerCase(),
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
    await Promise.all(
      book.chapters.map(async (chap) => {
        await mkdir(path.join(baseFolder, book.code, chap.number.toString()), {
          recursive: true,
        });

        const getBookChapterText = await fetch(
          `${baseUrl}/v1/book/${book.code}/chapter/${chap.number}/text?versionCode=${versionCode}&langCode=${langCode}&webOrigin=${webOrigin}`,
        );

        const { text } = await getBookChapterText.json();

        if (!text) {
          console.log('Error (md)', book.code, chap.number);

          return;
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
          `${baseUrl}/v1/book/${book.code}/chapter/${chap.number}/html?versionCode=${versionCode}&langCode=${langCode}&webOrigin=${webOrigin}`,
        );

        const { html } = await getBookChapterHtml.json();

        if (!html) {
          console.log('Error (html)', book.code, chap.number);

          return;
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
          `${baseUrl}/v1/book/${book.code}/chapter/${chap.number}?versionCode=${versionCode}&langCode=${langCode}&webOrigin=${webOrigin}`,
        );

        const res = await getBookChapterJson.json();

        if (!res) {
          console.log('Error (json)', book.code, chap.number);

          return;
        }

        await writeFile(
          path.join(
            baseFolder,
            book.code,
            chap.number.toString(),
            `${chap.number}.json`,
          ),
          JSON.stringify(res, null, 2),
        );
      }),
    );
  }
};

export { generateBibleMetadata, generateBibleData };
