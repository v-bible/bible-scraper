/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
import { type Book, type Chapter } from '@prisma/client';
import { type VerseData } from '@/@types';
import { type FootnoteData } from '@/ktcgkpv.org/getVerse';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

export const insertData = async (
  verseData: VerseData[],
  book: Book,
  chapter: Chapter,
  fnMap: FootnoteData[],
) => {
  for (const data of verseData) {
    const newVerse = await prisma.verse.upsert({
      where: {
        number_subVerseIndex_chapterId: {
          number: data.verse.number,
          subVerseIndex: data.verse.subVerseIndex,
          chapterId: chapter.id,
        },
      },
      create: {
        number: data.verse.number,
        subVerseIndex: data.verse.subVerseIndex,
        text: data.verse.text,
        paragraphNumber: data.verse.paragraphNumber,
        isPoetry: data.verse.isPoetry,
        chapterId: chapter.id,
      },
      update: {
        number: data.verse.number,
        subVerseIndex: data.verse.subVerseIndex,
        text: data.verse.text,
        paragraphNumber: data.verse.paragraphNumber,
        isPoetry: data.verse.isPoetry,
      },
    });

    logger.info(
      'Get verse %s:%s for book %s',
      chapter.number,
      data.verse.number,
      book.name,
    );

    logger.debug(
      'Verse %s:%s content: %s',
      chapter.number,
      data.verse.number,
      data.verse.text,
    );

    if (data.verse.isPoetry) {
      logger.info(
        'Verse %s:%s is poetry for book %s',
        chapter.number,
        data.verse.number,
        book.name,
      );
    }

    for (const vHeading of data.headings) {
      const newHeading = await prisma.heading.upsert({
        where: {
          sortOrder_verseId: {
            sortOrder: vHeading.sortOrder,
            verseId: newVerse.id,
          },
        },
        create: {
          sortOrder: vHeading.sortOrder,
          level: vHeading.level,
          text: vHeading.text,
          chapterId: chapter.id,
          verseId: newVerse.id,
        },
        update: {
          sortOrder: vHeading.sortOrder,
          level: vHeading.level,
          text: vHeading.text,
        },
      });

      logger.info(
        'Get heading %s:%s for book %s',
        chapter.number,
        data.verse.number,
        book.name,
      );

      logger.debug(
        'Heading %s:%s content: %s',
        chapter.number,
        data.verse.number,
        vHeading.text,
      );

      for (const hFootnote of vHeading.footnotes) {
        const testFootnote = (fn: (typeof fnMap)[number]) =>
          fn.marker ===
            `ci${chapter.number}_${newVerse.number}_${hFootnote.label}` ||
          (fn.marker.split('_').at(1)?.includes(`${newVerse.number}`) &&
            fn.marker.split('_').at(2)?.includes(`${hFootnote.label}`));

        const testProperNameOrRef = (fn: (typeof fnMap)[number]) => {
          return fn?.marker === hFootnote.label;
        };

        let hFootnoteData = null;

        // NOTE: Case like St 2, ci2_4b_q won't match ci2_4_q, so we have to
        // have loose check for this
        hFootnoteData = fnMap.find(testFootnote);
        if (!hFootnoteData) {
          hFootnoteData = fnMap.find(testProperNameOrRef);
        }

        if (!hFootnoteData) {
          continue;
        }

        await prisma.footnote.upsert({
          where: {
            sortOrder_headingId_type: {
              sortOrder: hFootnoteData.sortOrder,
              headingId: newHeading.id,
              type: hFootnoteData.type,
            },
          },
          create: {
            type: hFootnoteData.type,
            marker: hFootnoteData.marker,
            text: hFootnoteData.text.trim(),
            sortOrder: hFootnoteData.sortOrder,
            position: hFootnote.position,
            headingId: newHeading.id,
            chapterId: chapter.id,
          },
          update: {
            type: hFootnoteData.type,
            marker: hFootnoteData.marker,
            text: hFootnoteData.text.trim(),
            sortOrder: hFootnoteData.sortOrder,
            position: hFootnote.position,
          },
        });

        logger.info(
          'Get heading footnote %s:%s for book %s - %s',
          chapter.number,
          data.verse.number,
          book.name,
          hFootnoteData.type,
        );

        logger.debug(
          'Heading footnote %s:%s content: %s - %s',
          chapter.number,
          data.verse.number,
          hFootnoteData.text.trim(),
          hFootnoteData.type,
        );
      }
    }

    for (const vFootnote of data.footnotes) {
      const testFootnote = (fn: (typeof fnMap)[number]) =>
        fn.marker ===
          `ci${chapter.number}_${newVerse.number}_${vFootnote.label}` ||
        (fn.marker.split('_').at(1)?.includes(`${newVerse.number}`) &&
          fn.marker.split('_').at(2)?.includes(`${vFootnote.label}`));

      const testProperNameOrRef = (fn: (typeof fnMap)[number]) => {
        return fn?.marker === vFootnote.label;
      };

      let vFootnoteData = null;

      // NOTE: Case like St 2, ci2_4b_q won't match ci2_4_q, so we have to
      // have loose check for this
      vFootnoteData = fnMap.find(testFootnote);
      if (!vFootnoteData) {
        vFootnoteData = fnMap.find(testProperNameOrRef);
      }

      if (!vFootnoteData) {
        continue;
      }

      await prisma.footnote.upsert({
        where: {
          sortOrder_verseId_type: {
            sortOrder: vFootnoteData.sortOrder,
            verseId: newVerse.id,
            type: vFootnoteData.type,
          },
        },
        create: {
          type: vFootnoteData.type,
          marker: vFootnoteData.marker,
          text: vFootnoteData.text.trim(),
          sortOrder: vFootnoteData.sortOrder,
          position: vFootnote.position,
          verseId: newVerse.id,
          chapterId: chapter.id,
        },
        update: {
          type: vFootnoteData.type,
          marker: vFootnoteData.marker,
          text: vFootnoteData.text.trim(),
          sortOrder: vFootnoteData.sortOrder,
          position: vFootnote.position,
        },
      });

      logger.info(
        'Get footnote %s:%s for book %s - %s',
        chapter.number,
        data.verse.number,
        book.name,
        vFootnoteData.type,
      );

      logger.debug(
        'Footnote %s:%s content: %s - %s',
        chapter.number,
        data.verse.number,
        vFootnoteData.text.trim(),
        vFootnoteData.type,
      );
    }
  }
};
