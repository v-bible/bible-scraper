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
        const hFootnoteContent = fnMap
          .filter((fn) => fn?.label === hFootnote.label.replaceAll('\\', ''))
          .at(0)!;

        if (!hFootnoteContent) {
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
          hFootnote.kind === 'FOOTNOTE' ? fnOrder : refOrder;

        // NOTE: Footnote label starts from 1
        const footnoteLabel =
          hFootnote.kind === 'FOOTNOTE'
            ? `${currentSortOrder + 1}`
            : `${currentSortOrder + 1}@`;

        await upsertMark(db, {
          kind: hFootnote.kind,
          label: footnoteLabel,
          content: hFootnoteContent.content.trim(),
          sortOrder: currentSortOrder,
          startOffset: hFootnote.startOffset,
          endOffset: hFootnote.endOffset,
          targetId: newHeading.id,
          targetType: 'HEADING',
          chapterId: chapter.id,
        });

        if (hFootnote.kind === 'FOOTNOTE') {
          fnOrder += 1;
        } else {
          refOrder += 1;
        }

        logger.info(
          'Get heading footnote %s:%s for book %s - %s',
          chapter.number,
          data.verse.number,
          book.name,
          hFootnote.kind,
        );

        logger.debug(
          'Heading footnote %s:%s content: %s - %s',
          chapter.number,
          data.verse.number,
          hFootnote.label.trim(),
          hFootnote.kind,
        );
      }
    }

    // eslint-disable-next-line no-restricted-syntax
    for await (const vFootnote of data.footnotes) {
      // NOTE: Reference have no footnote data
      let vFootnoteContent: string | undefined = vFootnote.label;

      if (vFootnote.kind === 'FOOTNOTE') {
        vFootnoteContent = fnMap
          .filter((fn) => fn?.label === vFootnote.label.replaceAll('\\', ''))
          .at(0)?.content;
      }

      if (!vFootnoteContent) {
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
        vFootnote.kind === 'FOOTNOTE' ? fnOrder : refOrder;

      // NOTE: Footnote label starts from 1
      const footnoteLabel =
        vFootnote.kind === 'FOOTNOTE'
          ? `${currentSortOrder + 1}`
          : `${currentSortOrder + 1}@`;

      await upsertMark(db, {
        kind: vFootnote.kind,
        label: footnoteLabel,
        content: vFootnoteContent.trim(),
        sortOrder: currentSortOrder,
        startOffset: vFootnote.startOffset,
        endOffset: vFootnote.endOffset,
        targetType: 'VERSE',
        targetId: newVerse.id,
        chapterId: chapter.id,
      });

      if (vFootnote.kind === 'FOOTNOTE') {
        fnOrder += 1;
      } else {
        refOrder += 1;
      }

      logger.info(
        'Get footnote %s:%s for book %s - %s',
        chapter.number,
        data.verse.number,
        book.name,
        vFootnote.kind,
      );

      logger.debug(
        'Footnote %s:%s content: %s - %s',
        chapter.number,
        data.verse.number,
        vFootnote.label.trim(),
        vFootnote.kind,
      );
    }

    // eslint-disable-next-line no-restricted-syntax
    for await (const vWoj of data?.wordsOfJesus || []) {
      await upsertMark(db, {
        kind: 'WORDS_OF_JESUS',
        label: '',
        content: vWoj.content,
        sortOrder: vWoj.sortOrder,
        startOffset: vWoj.startOffset,
        endOffset: vWoj.endOffset,
        targetType: 'VERSE',
        targetId: newVerse.id,
        chapterId: chapter.id,
      });

      logger.info(
        'Get words of Jesus %s:%s for book %s',
        chapter.number,
        data.verse.number,
        book.name,
      );

      logger.debug(
        'Words of Jesus %s:%s content: %s',
        chapter.number,
        data.verse.number,
        vWoj.content,
      );
    }
  }
};
