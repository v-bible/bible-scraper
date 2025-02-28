/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
import type { Prisma } from '@prisma/client';
import type { VData } from '@/ktcgkpv/get-verse';
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
  refMap: ({
    label: string;
    order: number;
    content: string;
  } | null)[],
) => {
  for (const vData of data) {
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
          // NOTE: All heading from ktcgkpv is level 4 so we change it to 1
          level:
            vHeading.level === 4 && vHeading.order === 0 ? 1 : vHeading.level,
          content: vHeading.content,
        },
        create: {
          order: vHeading.order,
          level:
            vHeading.level === 4 && vHeading.order === 0 ? 1 : vHeading.level,
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
        // NOTE: Case like St 2, ci2_4b_q won't match ci2_4_q, so we have to
        // have loose check for this
        const hFootnoteData = fnMap.find(
          (fn) =>
            fn?.label ===
              `ci${chap.number}_${newVerse.number}_${hFootnote.label}` ||
            (fn?.label.split('_').at(1)?.includes(`${newVerse.number}`) &&
              fn?.label.split('_').at(2)?.includes(`${hFootnote.label}`)),
        );

        if (!hFootnoteData) {
          continue;
        }

        await prisma.bookFootnote.upsert({
          where: {
            order_headingId: {
              order: hFootnoteData.order,
              headingId: newHeading.id,
            },
          },
          update: {
            order: hFootnoteData.order,
            content: hFootnoteData.content.trim(),
            position: hFootnote.position,
          },
          create: {
            order: hFootnoteData.order,
            content: hFootnoteData.content.trim(),
            position: hFootnote.position,
            headingId: newHeading.id,
            chapterId: chap.id,
          },
        });

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
          hFootnoteData.content.trim(),
        );
      }

      for (const hRef of vHeading.references) {
        const hRefData = refMap.find((ref) => ref?.label === hRef.label);

        if (!hRefData) {
          continue;
        }

        await prisma.bookReference.upsert({
          where: {
            order_headingId: {
              order: hRefData.order,
              headingId: newHeading.id,
            },
          },
          update: {
            order: hRefData.order,
            content: hRefData.content.trim(),
            position: hRef.position,
          },
          create: {
            order: hRefData.order,
            content: hRefData.content.trim(),
            position: hRef.position,
            headingId: newHeading.id,
            chapterId: chap.id,
          },
        });

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
          hRefData.content.trim(),
        );
      }
    }

    for (const vFootnote of vData.footnotes) {
      // NOTE: Case like St 2, ci2_4b_q won't match ci2_4_q, so we have to
      // have loose check for this
      const vFootnoteData = fnMap.find(
        (fn) =>
          fn?.label ===
            `ci${chap.number}_${newVerse.number}_${vFootnote.label}` ||
          (fn?.label.split('_').at(1)?.includes(`${newVerse.number}`) &&
            fn?.label.split('_').at(2)?.includes(`${vFootnote.label}`)),
      );

      if (!vFootnoteData) {
        continue;
      }

      await prisma.bookFootnote.upsert({
        where: {
          order_verseId: {
            order: vFootnoteData.order,
            verseId: newVerse.id,
          },
        },
        update: {
          order: vFootnoteData.order,
          content: vFootnoteData.content.trim(),
          position: vFootnote.position,
        },
        create: {
          order: vFootnoteData.order,
          content: vFootnoteData.content.trim(),
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
        vFootnoteData.content.trim(),
      );
    }

    for (const vRef of vData.references) {
      const vRefData = refMap.find((ref) => ref?.label === vRef.label);

      if (!vRefData) {
        continue;
      }

      await prisma.bookReference.upsert({
        where: {
          order_verseId: {
            order: vRefData.order,
            verseId: newVerse.id,
          },
        },
        update: {
          order: vRefData.order,
          content: vRefData.content.trim(),
          position: vRef.position,
        },
        create: {
          order: vRefData.order,
          content: vRefData.content.trim(),
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
        vRefData.content.trim(),
      );
    }
  }
};
