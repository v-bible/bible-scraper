import { type Book, type Chapter } from '@prisma/client';
import { type FootnoteData, type VerseData } from '@/@types';
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

  // eslint-disable-next-line no-restricted-syntax
  for await (const data of verseData) {
    const verseLabel =
      data.verse.label.trim() === ''
        ? `${data.verse.number}`
        : data.verse.label.trim();

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
        label: verseLabel,
        chapterId: chapter.id,
      },
      update: {
        number: data.verse.number,
        subVerseIndex: data.verse.subVerseIndex,
        text: data.verse.text,
        paragraphNumber: data.verse.paragraphNumber,
        paragraphIndex: data.verse.paragraphIndex,
        isPoetry: data.verse.isPoetry,
        label: verseLabel,
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

    // eslint-disable-next-line no-restricted-syntax
    // eslint-disable-next-line no-restricted-syntax
    for await (const vHeading of data.headings) {
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

      // eslint-disable-next-line no-restricted-syntax
      for await (const hFootnote of vHeading.footnotes) {
        const hFootnoteContent = fnMap
          .filter((fn) => fn?.label === hFootnote.label.replaceAll('\\', ''))
          .at(0)!;

        if (!hFootnoteContent) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const currentSortOrder =
          hFootnote.type === 'footnote' ? fnOrder : refOrder;

        // NOTE: Footnote label starts from 1
        const footnoteLabel =
          hFootnote.type === 'footnote'
            ? `${currentSortOrder + 1}`
            : `${currentSortOrder + 1}@`;

        await prisma.footnote.upsert({
          where: {
            sortOrder_headingId_type: {
              sortOrder: currentSortOrder,
              headingId: newHeading.id,
              type: hFootnote.type,
            },
          },
          create: {
            type: hFootnote.type,
            label: footnoteLabel,
            text: hFootnoteContent.text.trim(),
            sortOrder: currentSortOrder,
            position: hFootnote.position,
            headingId: newHeading.id,
            chapterId: chapter.id,
          },
          update: {
            type: hFootnote.type,
            label: footnoteLabel,
            text: hFootnoteContent.text.trim(),
            sortOrder: currentSortOrder,
            position: hFootnote.position,
          },
        });

        if (hFootnote.type === 'footnote') {
          fnOrder += 1;
        } else {
          refOrder += 1;
        }

        logger.info(
          'Get heading footnote %s:%s for book %s - %s',
          chapter.number,
          data.verse.number,
          book.name,
          hFootnote.type,
        );

        logger.debug(
          'Heading footnote %s:%s content: %s - %s',
          chapter.number,
          data.verse.number,
          hFootnote.label.trim(),
          hFootnote.type,
        );
      }
    }

    // eslint-disable-next-line no-restricted-syntax
    for await (const vFootnote of data.footnotes) {
      // NOTE: Reference have no footnote data
      let vFootnoteContent = vFootnote.label;

      if (vFootnote.type === 'footnote') {
        vFootnoteContent = fnMap
          .filter((fn) => fn?.label === vFootnote.label.replaceAll('\\', ''))
          .at(0)!.text;
      }

      if (!vFootnoteContent) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const currentSortOrder =
        vFootnote.type === 'footnote' ? fnOrder : refOrder;

      // NOTE: Footnote label starts from 1
      const footnoteLabel =
        vFootnote.type === 'footnote'
          ? `${currentSortOrder + 1}`
          : `${currentSortOrder + 1}@`;

      await prisma.footnote.upsert({
        where: {
          sortOrder_verseId_type: {
            sortOrder: currentSortOrder,
            verseId: newVerse.id,
            type: vFootnote.type,
          },
        },
        create: {
          type: vFootnote.type,
          label: footnoteLabel,
          text: vFootnoteContent.trim(),
          sortOrder: currentSortOrder,
          position: vFootnote.position,
          verseId: newVerse.id,
          chapterId: chapter.id,
        },
        update: {
          type: vFootnote.type,
          label: footnoteLabel,
          text: vFootnoteContent.trim(),
          sortOrder: currentSortOrder,
          position: vFootnote.position,
        },
      });

      if (vFootnote.type === 'footnote') {
        fnOrder += 1;
      } else {
        refOrder += 1;
      }

      logger.info(
        'Get footnote %s:%s for book %s - %s',
        chapter.number,
        data.verse.number,
        book.name,
        vFootnote.type,
      );

      logger.debug(
        'Footnote %s:%s content: %s - %s',
        chapter.number,
        data.verse.number,
        vFootnote.label.trim(),
        vFootnote.type,
      );
    }
  }
};
