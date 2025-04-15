/* eslint-disable no-restricted-syntax */
import { mkdir, writeFile } from 'fs/promises';
import { uniqWith } from 'es-toolkit';
import { Agent, setGlobalDispatcher } from 'undici';
import { getAll } from '@/ktcgkpv/get-all';
import { getBook } from '@/ktcgkpv/get-book';
import { getProperName } from '@/ktcgkpv/get-proper-name';
import { withCheckpoint } from '@/lib/checkpoint';
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

  const properNames: Awaited<ReturnType<typeof getProperName>>[] = [];

  await mkdir('./dist', { recursive: true });

  await withCheckpoint(
    books,
    async (chapters, setCheckpoint) => {
      for await (const chap of chapters) {
        await getAll(chap);

        const properName = await getProperName(chap);

        properNames.push(properName);

        await setCheckpoint({
          bookCode: chap.book.code,
          chapterNumber: chap.number,
          completed: true,
        });
      }
    },
    `./dist/${version.code}.json`,
  );

  const uniqProperNames = uniqWith(
    properNames.flat(),
    (a, b) => a.origin === b.origin,
  );

  // NOTE: Write to file
  await writeFile(
    './dist/proper-names.json',
    JSON.stringify(uniqProperNames, null, 2),
  );
})();
