import { type Book, type Chapter } from '@/../drizzle/sqlite/schema.js';
import { type FootnoteData, type VerseData } from '@/@types';
import { type DrizzleClient } from '@/drizzle/sqlite/index.js';
import {
  upsertHeading,
  upsertMark,
  upsertVerse,
} from '@/drizzle/sqlite/operations.js';
import { logger } from '@/logger/logger';

export const insertData = async (
  verseData: VerseData[],
  book: Book,
  chapter: Chapter,
  fnMap: FootnoteData[],
  db: DrizzleClient,
) => {
  let fnOrder = 0;
  let refOrder = 0;

  // eslint-disable-next-line no-restricted-syntax
  for await (const data of verseData) {
    const verseLabel =
      data.verse.label.trim() === ''
        ? `${data.verse.number}`
        : data.verse.label.trim();

    const newVerse = await upsertVerse(db, {
      number: data.verse.number,
      subVerseIndex: data.verse.subVerseIndex,
      text: data.verse.text,
      paragraphNumber: data.verse.paragraphNumber,
      paragraphIndex: data.verse.paragraphIndex,
      isPoetry: data.verse.isPoetry,
      label: verseLabel,
      chapterId: chapter.id,
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
    for await (const vHeading of data.headings) {
      const newHeading = await upsertHeading(db, {
        sortOrder: vHeading.sortOrder,
        level: vHeading.level,
        text: vHeading.text,
        chapterId: chapter.id,
        verseId: newVerse.id,
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
        const testFootnote = (fn: (typeof fnMap)[number]) =>
          hFootnote.kind === fn.kind &&
          (fn.label ===
            `ci${chapter.number}_${newVerse.number}_${hFootnote.label}` ||
            (fn.label.split('_').at(1)?.includes(`${newVerse.number}`) &&
              fn.label.split('_').at(2)?.includes(`${hFootnote.label}`)));

        const testProperNameOrRef = (fn: (typeof fnMap)[number]) =>
          hFootnote.kind === fn.kind && fn.label.includes(hFootnote.label);

        let hFootnoteData = null;

        // NOTE: Case like St 2, ci2_4b_q won't match ci2_4_q, so we have to
        // have loose check for this
        hFootnoteData = fnMap.find(testFootnote);
        if (!hFootnoteData) {
          hFootnoteData = fnMap.find(testProperNameOrRef);
        }

        if (!hFootnoteData) {
          logger.warn(
            'Cannot find footnote for heading %s:%s - %s',
            chapter.number,
            data.verse.number,
            hFootnote.label,
          );
          // eslint-disable-next-line no-continue
          continue;
        }

        const currentSortOrder =
          hFootnoteData.kind === 'FOOTNOTE' ? fnOrder : refOrder;

        // NOTE: Footnote label starts from 1
        const footnoteLabel =
          hFootnoteData.kind === 'FOOTNOTE'
            ? `${currentSortOrder + 1}`
            : `${currentSortOrder + 1}@`;

        await upsertMark(db, {
          kind: hFootnoteData.kind,
          label: footnoteLabel,
          content: hFootnoteData.content.trim(),
          sortOrder: currentSortOrder,
          startOffset: hFootnote.startOffset,
          endOffset: hFootnote.endOffset,
          targetType: 'HEADING',
          targetId: newHeading.id,
          chapterId: chapter.id,
        });

        if (hFootnoteData.kind === 'FOOTNOTE') {
          fnOrder += 1;
        } else {
          refOrder += 1;
        }

        logger.info(
          'Get heading footnote %s:%s for book %s - %s',
          chapter.number,
          data.verse.number,
          book.name,
          hFootnoteData.kind,
        );

        logger.debug(
          'Heading footnote %s:%s content: %s - %s',
          chapter.number,
          data.verse.number,
          hFootnoteData.content.trim(),
          hFootnoteData.kind,
        );
      }
    }

    // eslint-disable-next-line no-restricted-syntax
    for await (const vFootnote of data.footnotes) {
      const testFootnote = (fn: (typeof fnMap)[number]) =>
        vFootnote.kind === fn.kind &&
        (fn.label ===
          `ci${chapter.number}_${newVerse.number}_${vFootnote.label}` ||
          (fn.label.split('_').at(1)?.includes(`${newVerse.number}`) &&
            fn.label.split('_').at(2)?.includes(`${vFootnote.label}`)));

      const testProperNameOrRef = (fn: (typeof fnMap)[number]) =>
        vFootnote.kind === fn.kind && fn.label.includes(vFootnote.label);

      let vFootnoteData = null;

      // NOTE: Case like St 2, ci2_4b_q won't match ci2_4_q, so we have to
      // have loose check for this
      vFootnoteData = fnMap.find(testFootnote);
      if (!vFootnoteData) {
        vFootnoteData = fnMap.find(testProperNameOrRef);
      }

      if (!vFootnoteData) {
        logger.warn(
          'Cannot find footnote for verse %s:%s - %s',
          chapter.number,
          data.verse.number,
          vFootnote.label,
        );
        // eslint-disable-next-line no-continue
        continue;
      }

      const currentSortOrder =
        vFootnoteData.kind === 'FOOTNOTE' ? fnOrder : refOrder;

      // NOTE: Footnote label starts from 1
      const footnoteLabel =
        vFootnoteData.kind === 'FOOTNOTE'
          ? `${currentSortOrder + 1}`
          : `${currentSortOrder + 1}@`;

      await upsertMark(db, {
        kind: vFootnoteData.kind,
        label: footnoteLabel,
        content: vFootnoteData.content.trim(),
        sortOrder: currentSortOrder,
        startOffset: vFootnote.startOffset,
        endOffset: vFootnote.endOffset,
        targetType: 'VERSE',
        targetId: newVerse.id,
        chapterId: chapter.id,
      });

      if (vFootnoteData.kind === 'FOOTNOTE') {
        fnOrder += 1;
      } else {
        refOrder += 1;
      }

      logger.info(
        'Get footnote %s:%s for book %s - %s',
        chapter.number,
        data.verse.number,
        book.name,
        vFootnoteData.kind,
      );

      logger.debug(
        'Footnote %s:%s content: %s - %s',
        chapter.number,
        data.verse.number,
        vFootnoteData.content.trim(),
        vFootnoteData.kind,
      );
    }
  }
};
