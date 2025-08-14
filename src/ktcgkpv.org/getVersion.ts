import { versionMapping } from '@/ktcgkpv.org/mapping';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

const getVersion = async () => {
  return Promise.all(
    Object.entries(versionMapping).map(([versionKey, versionInfo]) => {
      const newVersion = prisma.version.upsert({
        where: {
          code_language_source_formatType: {
            code: versionKey,
            language: 'vi',
            source: 'ktcgkpv.org',
            formatType: 'ebook',
          },
        },
        create: {
          code: versionKey,
          name: versionInfo.title,
          language: 'vi',
          source: 'ktcgkpv.org',
          formatType: 'ebook',
          sourceUrl: `https://ktcgkpv.org/bible?version=${versionInfo.number}`,
          hasNewTestament: true,
          hasOldTestament: true,
          hasApocrypha: false,
        },
        update: {
          code: versionKey,
          name: versionInfo.title,
          language: 'vi',
          source: 'ktcgkpv.org',
          formatType: 'ebook',
          sourceUrl: `https://ktcgkpv.org/bible?version=${versionInfo.number}`,
          hasNewTestament: true,
          hasOldTestament: true,
          hasApocrypha: false,
        },
      });

      logger.info(`Get version: ${versionKey} - ${versionInfo.title}`);

      return newVersion;
    }),
  );
};

export { getVersion };
