/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { writeFile } from 'fs/promises';
import { uniqWith } from 'es-toolkit';
import { Agent, setGlobalDispatcher } from 'undici';
import { getAll } from '@/ktcgkpv/get-all';
import { getBook } from '@/ktcgkpv/get-book';
import { getProperName } from '@/ktcgkpv/get-proper-name';
import prisma from '@/prisma/prisma';

setGlobalDispatcher(new Agent({ connect: { timeout: 60_000 } }));

(async () => {
  await getBook();

  const version = await prisma.version.findFirstOrThrow({
    where: {
      code: 'KT2011',
      language: {
        webOrigin: 'https://ktcgkpv.org/',
      },
    },
    include: {
      formats: true,
    },
  });

  const books = await prisma.book.findMany({
    where: {
      versionId: version.id,
    },
  });

  let properNames = [];

  for (const book of books) {
    const chapters = await prisma.bookChapter.findMany({
      where: {
        bookId: book.id,
      },
      include: {
        book: true,
      },
    });

    for (const chap of chapters) {
      await getAll(chap);

      const properName = await getProperName(chap);

      properNames.push(properName);
    }
  }

  properNames = uniqWith(properNames.flat(), (a, b) => a.origin === b.origin);

  // NOTE: Write to file
  writeFile('proper-names.json', JSON.stringify(properNames, null, 2));
})();
