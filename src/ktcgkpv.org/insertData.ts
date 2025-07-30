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
  let fnOrder = 0;
  let refOrder = 0;

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
        paragraphIndex: data.verse.paragraphIndex,
        isPoetry: data.verse.isPoetry,
        label: data.verse.label,
        chapterId: chapter.id,
      },
      update: {
        number: data.verse.number,
        subVerseIndex: data.verse.subVerseIndex,
        text: data.verse.text,
        paragraphNumber: data.verse.paragraphNumber,
        paragraphIndex: data.verse.paragraphIndex,
        isPoetry: data.verse.isPoetry,
        label: data.verse.label,
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
          hFootnote.type === fn.type &&
          (fn.label ===
            `ci${chapter.number}_${newVerse.number}_${hFootnote.label}` ||
            (fn.label.split('_').at(1)?.includes(`${newVerse.number}`) &&
              fn.label.split('_').at(2)?.includes(`${hFootnote.label}`)));

        const testProperNameOrRef = (fn: (typeof fnMap)[number]) =>
          hFootnote.type === fn.type && fn.label.includes(hFootnote.label);

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

        const currentSortOrder =
          hFootnoteData.type === 'footnote' ? fnOrder : refOrder;

        const footnoteLabel =
          hFootnoteData.type === 'footnote'
            ? `${currentSortOrder}`
            : `${currentSortOrder}@`;

        await prisma.footnote.upsert({
          where: {
            sortOrder_headingId_type: {
              sortOrder: currentSortOrder,
              headingId: newHeading.id,
              type: hFootnoteData.type,
            },
          },
          create: {
            type: hFootnoteData.type,
            label: footnoteLabel,
            text: hFootnoteData.text.trim(),
            sortOrder: currentSortOrder,
            position: hFootnote.position,
            headingId: newHeading.id,
            chapterId: chapter.id,
          },
          update: {
            type: hFootnoteData.type,
            label: footnoteLabel,
            text: hFootnoteData.text.trim(),
            sortOrder: currentSortOrder,
            position: hFootnote.position,
          },
        });

        if (hFootnoteData.type === 'footnote') {
          fnOrder += 1;
        } else {
          refOrder += 1;
        }

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
        vFootnote.type === fn.type &&
        (fn.label ===
          `ci${chapter.number}_${newVerse.number}_${vFootnote.label}` ||
          (fn.label.split('_').at(1)?.includes(`${newVerse.number}`) &&
            fn.label.split('_').at(2)?.includes(`${vFootnote.label}`)));

      const testProperNameOrRef = (fn: (typeof fnMap)[number]) =>
        vFootnote.type === fn.type && fn.label.includes(vFootnote.label);

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

      const currentSortOrder =
        vFootnoteData.type === 'footnote' ? fnOrder : refOrder;

      const footnoteLabel =
        vFootnoteData.type === 'footnote'
          ? `${currentSortOrder}`
          : `${currentSortOrder}@`;

      await prisma.footnote.upsert({
        where: {
          sortOrder_verseId_type: {
            sortOrder: currentSortOrder,
            verseId: newVerse.id,
            type: vFootnoteData.type,
          },
        },
        create: {
          type: vFootnoteData.type,
          label: footnoteLabel,
          text: vFootnoteData.text.trim(),
          sortOrder: currentSortOrder,
          position: vFootnote.position,
          verseId: newVerse.id,
          chapterId: chapter.id,
        },
        update: {
          type: vFootnoteData.type,
          label: footnoteLabel,
          text: vFootnoteData.text.trim(),
          sortOrder: currentSortOrder,
          position: vFootnote.position,
        },
      });

      if (vFootnoteData.type === 'footnote') {
        fnOrder += 1;
      } else {
        refOrder += 1;
      }

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
