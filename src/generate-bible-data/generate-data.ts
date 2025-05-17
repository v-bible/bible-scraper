/* eslint-disable no-continue */
import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
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
    code: 'BD2011',
    name: 'Bản Dịch 2011 (BD2011)',
    language: {
      code: 'vi',
      origin: 'biblegateway',
      webOrigin: 'https://www.biblegateway.com',
    },
  },
  bibledotcom: {
    code: 'BD2011',
    name: 'Kinh Thánh Tiếng Việt, Bản Dịch 2011',
    language: {
      code: 'vie',
      origin: 'bibledotcom',
      webOrigin: 'https://www.bible.com',
    },
  },
  ktcgkpv: {
    code: 'KT2011',
    name: 'KPA : ấn bản KT 2011',
    language: {
      code: 'vi',
      origin: 'ktcgkpv',
      webOrigin: 'https://ktcgkpv.org/',
    },
  },
} satisfies Record<
  string,
  Prisma.VersionGetPayload<{
    select: {
      code: true;
      name: true;
      id: false;
      createdAt: false;
      updatedAt: false;
      onlyNT: false;
      onlyOT: false;
      withApocrypha: false;
      language: {
        select: {
          code: true;
          origin: true;
          webOrigin: true;
          id: false;
          name: false;
          createdAt: false;
          updatedAt: false;
          versions: false;
        };
      };
    };
  }>
>;

const generateBibleMetadata = async (
  version = presets.ktcgkpv,
  baseDir = '../../dist/books/bible/versions',
) => {
  const {
    code: versionCode,
    language: { code: langCode, webOrigin, origin },
  } = version;

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
  version = presets.ktcgkpv,
  baseUrl = 'http://localhost:8081/api',
) => {
  const {
    code: versionCode,
    language: { code: langCode, webOrigin, origin },
  } = version;

  await generateBibleMetadata(version, '../../dist/books/bible/versions');

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
    '../../dist/books/bible/versions/',
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
    // eslint-disable-next-line no-restricted-syntax
    for await (const chap of book.chapters) {
      await mkdir(path.join(baseFolder, book.code, chap.number.toString()), {
        recursive: true,
      });

      const getBookChapterText = await fetch(
        `${baseUrl}/v1/book/${book.code}/chapter/${chap.number}/text?versionCode=${versionCode}&langCode=${langCode}&webOrigin=${webOrigin}`,
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
        `${baseUrl}/v1/book/${book.code}/chapter/${chap.number}/html?versionCode=${versionCode}&langCode=${langCode}&webOrigin=${webOrigin}`,
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
        `${baseUrl}/v1/book/${book.code}/chapter/${chap.number}?versionCode=${versionCode}&langCode=${langCode}&webOrigin=${webOrigin}`,
      );

      let res = await getBookChapterJson.json();

      if (!res) {
        console.log('Error (json)', book.code, chap.number);

        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { chapters, ...bookData } = book;

      res = {
        ...res,
        book: bookData,
      };

      await writeFile(
        path.join(
          baseFolder,
          book.code,
          chap.number.toString(),
          `${chap.number}.json`,
        ),
        JSON.stringify(res, null, 2),
      );

      await mkdir(path.join(__dirname, '../../dist/data/books/bible/'), {
        recursive: true,
      });

      await appendFile(
        path.join(
          __dirname,
          '../../dist/data/books/bible/',
          `${origin}-${versionCode.toLocaleLowerCase()}.jsonl`,
        ),
        `${JSON.stringify(res)}\n`,
      );
    }
  }
};

export { generateBibleMetadata, generateBibleData };
