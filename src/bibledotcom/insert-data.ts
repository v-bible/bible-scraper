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
) => {
  let refOrder = 0;
  let fnOrder = 0;

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
      const newHeading = await prisma.bookHeading.upsert({
        where: {
          order_verseId: {
            order: vHeading.order,
            verseId: newVerse.id,
          },
        },
        update: {
          order: vHeading.order,
          level: vHeading.level,
          content: vHeading.content,
        },
        create: {
          order: vHeading.order,
          level: vHeading.level,
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

      for (const hFootnote of vHeading.footnotes) {
        await prisma.bookFootnote.upsert({
          where: {
            order_headingId: {
              order: fnOrder,
              headingId: newHeading.id,
            },
          },
          update: {
            order: fnOrder,
            content: hFootnote.label.trim(),
            position: hFootnote.position,
          },
          create: {
            order: fnOrder,
            content: hFootnote.label.trim(),
            position: hFootnote.position,
            headingId: newHeading.id,
            chapterId: chap.id,
          },
        });

        fnOrder += 1;

        logger.info(
          'Get heading footnote %s:%s for book %s',
          chap.number,
          vData.verse.number,
          chap.book.title,
        );

        logger.debug(
          'Heading footnote %s:%s content: %s',
          chap.number,
          vData.verse.number,
          hFootnote.label.trim(),
        );
      }

      for (const hRef of vHeading.references) {
        await prisma.bookReference.upsert({
          where: {
            order_headingId: {
              order: refOrder,
              headingId: newHeading.id,
            },
          },
          update: {
            order: refOrder,
            content: hRef.label.trim(),
            position: hRef.position,
          },
          create: {
            order: refOrder,
            content: hRef.label.trim(),
            position: hRef.position,
            headingId: newHeading.id,
            chapterId: chap.id,
          },
        });

        refOrder += 1;

        logger.info(
          'Get heading reference %s:%s for book %s',
          chap.number,
          vData.verse.number,
          chap.book.title,
        );

        logger.debug(
          'Heading reference %s:%s content: %s',
          chap.number,
          vData.verse.number,
          hRef.label.trim(),
        );
      }
    }

    for (const vFootnote of vData.footnotes) {
      await prisma.bookFootnote.upsert({
        where: {
          order_verseId: {
            order: fnOrder,
            verseId: newVerse.id,
          },
        },
        update: {
          order: fnOrder,
          content: vFootnote.label.trim(),
          position: vFootnote.position,
        },
        create: {
          order: fnOrder,
          content: vFootnote.label.trim(),
          position: vFootnote.position,
          verseId: newVerse.id,
          chapterId: chap.id,
        },
      });

      fnOrder += 1;

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
        vFootnote.label.trim(),
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
          content: vRef.label.trim(),
          position: vRef.position,
        },
        create: {
          order: refOrder,
          content: vRef.label.trim(),
          position: vRef.position,
          verseId: newVerse.id,
          chapterId: chap.id,
        },
      });

      refOrder += 1;

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
        vRef.label.trim(),
      );
    }
  }
};
