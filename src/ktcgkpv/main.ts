/* eslint-disable no-restricted-syntax */
import { mkdir } from 'fs/promises';
import { Agent, setGlobalDispatcher } from 'undici';
import { getAll } from '@/ktcgkpv/get-all';
import { getBook } from '@/ktcgkpv/get-book';
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

  await mkdir('./dist', { recursive: true });

  await withCheckpoint(
    books,
    async (chapters, setCheckpoint) => {
      for await (const chap of chapters) {
        await getAll(chap);

        // const properName = await getProperName(chap);

        // properNames.push(properName);

        await setCheckpoint({
          bookCode: chap.book.code,
          chapterNumber: chap.number,
          completed: true,
        });
      }
    },
    { fileName: `./dist/${version.code}.json` },
  );
})();
