/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
import type { Prisma } from '@prisma/client';
import { VData } from '@/ktcgkpv/get-verse';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

export const insertData = async (
  data: VData[],
  chap: Prisma.BookChapterGetPayload<{
    include: {
      book: true;
    };
  }>,
  fnMap: ({
    label: string;
    order: number;
    content: string;
  } | null)[],
) => {
  let refOrder = 0;

  for (const vData of data) {
    if (!vData) {
      continue;
    }

    const newVerse = await prisma.bookVerse.upsert({
      where: {
        number_order_chapterId: {
          number: vData.verse.number,
          order: vData.verse.order,
          chapterId: chap.id,
        },
      },
      update: {
        number: vData.verse.number,
        content: vData.verse.content,
        order: vData.verse.order,
        parNumber: vData.verse.parNumber,
        parIndex: vData.verse.parIndex,
        isPoetry: vData.verse.isPoetry,
      },
      create: {
        number: vData.verse.number,
        content: vData.verse.content,
        order: vData.verse.order,
        parNumber: vData.verse.parNumber,
        parIndex: vData.verse.parIndex,
        isPoetry: vData.verse.isPoetry,
        chapterId: chap.id,
      },
    });

    logger.info(
      'Get verse %s:%s for book %s',
      chap.number,
      vData.verse.number,
      chap.book.title,
    );

    logger.debug(
      'Verse %s:%s content: %s',
      chap.number,
      vData.verse.number,
      vData.verse.content,
    );

    if (vData.verse.isPoetry) {
      logger.info(
        'Verse %s:%s is poetry for book %s',
        chap.number,
        vData.verse.number,
        chap.book.title,
      );
    }

    for (const vHeading of vData.headings) {
      await prisma.bookHeading.upsert({
        where: {
          order_verseId: {
            order: vHeading.order,
            verseId: newVerse.id,
          },
        },
        update: {
          order: vHeading.order,
          content: vHeading.content,
        },
        create: {
          order: vHeading.order,
          content: vHeading.content,
          verseId: newVerse.id,
          chapterId: chap.id,
        },
      });

      logger.info(
        'Get heading %s:%s for book %s',
        chap.number,
        vData.verse.number,
        chap.book.title,
      );

      logger.debug(
        'Heading %s:%s content: %s',
        chap.number,
        vData.verse.number,
        vHeading.content,
      );
    }

    for (const vFootnote of vData.footnotes) {
      const vFootnoteContent = fnMap
        .filter((fn) => fn?.label === vFootnote.label.replaceAll('\\', ''))
        .at(0)!;

      if (!vFootnoteContent) {
        continue;
      }

      // NOTE: Sometimes footnote is not present
      if (!vFootnoteContent) {
        continue;
      }

      await prisma.bookFootnote.upsert({
        where: {
          order_verseId: {
            order: vFootnoteContent.order,
            verseId: newVerse.id,
          },
        },
        update: {
          order: vFootnoteContent.order,
          content: vFootnoteContent.content,
          position: vFootnote.position,
        },
        create: {
          order: vFootnoteContent.order,
          content: vFootnoteContent.content,
          position: vFootnote.position,
          verseId: newVerse.id,
          chapterId: chap.id,
        },
      });

      logger.info(
        'Get footnote %s:%s for book %s',
        chap.number,
        vData.verse.number,
        chap.book.title,
      );

      logger.debug(
        'Footnote %s:%s content: %s',
        chap.number,
        vData.verse.number,
        vFootnoteContent.content,
      );
    }

    for (const vRef of vData.references) {
      await prisma.bookReference.upsert({
        where: {
          order_verseId: {
            order: refOrder,
            verseId: newVerse.id,
          },
        },
        update: {
          order: refOrder,
          content: vRef.label,
          position: vRef.position,
        },
        create: {
          order: refOrder,
          content: vRef.label,
          position: vRef.position,
          verseId: newVerse.id,
          chapterId: chap.id,
        },
      });

      logger.info(
        'Get reference %s:%s for book %s',
        chap.number,
        vData.verse.number,
        chap.book.title,
      );

      logger.debug(
        'Reference %s:%s content: %s',
        chap.number,
        vData.verse.number,
        vRef.label,
      );

      refOrder += 1;
    }
  }
};
