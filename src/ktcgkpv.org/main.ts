import { getBook } from '@/ktcgkpv.org/getBook';
import { getVerse } from '@/ktcgkpv.org/getVerse';
import { getVersion } from '@/ktcgkpv.org/getVersion';
import { versionMapping } from '@/ktcgkpv.org/mapping';

const main = async () => {
  const versionCode = 'KT2011' satisfies keyof typeof versionMapping;

  const versions = await getVersion();

  const books = await getBook(versions.find((v) => v.code === versionCode)!);

  // eslint-disable-next-line no-restricted-syntax
  for await (const bookData of books) {
    // eslint-disable-next-line no-restricted-syntax
    for await (const chapter of bookData.chapters) {
      await getVerse(bookData.book, chapter, {
        versionCode,
      });
    }
  }
};

main();
