/* eslint-disable no-restricted-syntax */
import { mkdir } from 'fs/promises';
import { Agent, setGlobalDispatcher } from 'undici';
import { getAll } from './get-all';
import { getBook } from '@/bibledotcom/get-book';
import { getPsalmMeta } from '@/bibledotcom/get-psalm-meta';
import { getVersionByLang } from '@/bibledotcom/get-version';
import { withCheckpoint } from '@/lib/checkpoint';
import prisma from '@/prisma/prisma';

setGlobalDispatcher(new Agent({ connect: { timeout: 60_000 } }));

(async () => {
  // NOTE: You can use "getVersion" func to scrap all the versions available.
  await getVersionByLang('vie');

  const version = await prisma.version.findFirstOrThrow({
    where: {
      code: 'BD2011',
      language: {
        webOrigin: 'https://www.bible.com',
      },
    },
    include: {
      formats: true,
    },
  });

  const versionFormat = await prisma.versionFormat.findFirstOrThrow({
    where: {
      versionId: version.id,
      type: 'ebook',
    },
    include: {
      version: true,
    },
  });

  await getBook(versionFormat);

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
        if (chap.book.code === 'psa') {
          await getPsalmMeta(chap);
        }

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
