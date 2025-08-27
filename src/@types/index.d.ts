import { type Heading, type Mark, type Verse } from '@prisma/client';

export type VerseData = {
  verse: Pick<
    Verse,
    | 'text'
    | 'number'
    | 'subVerseIndex'
    | 'isPoetry'
    | 'paragraphNumber'
    | 'paragraphIndex'
    | 'label'
  >;
  headings: Array<
    Pick<Heading, 'text' | 'level' | 'sortOrder'> & {
      footnotes: Array<
        Pick<Mark, 'startOffset' | 'endOffset' | 'label' | 'kind'>
      >;
    }
  >;
  footnotes: Array<Pick<Mark, 'startOffset' | 'endOffset' | 'label' | 'kind'>>;
  wordsOfJesus?: Array<
    Pick<Mark, 'startOffset' | 'endOffset' | 'sortOrder' | 'content'>
  >;
};

export type FootnoteData = Pick<Mark, 'label' | 'kind' | 'content'>;
