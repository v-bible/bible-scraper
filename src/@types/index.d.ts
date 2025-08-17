import {
  type Footnote,
  type Heading,
  type Verse,
  type WordsOfJesus,
} from '@prisma/client';

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
      footnotes: Array<Pick<Footnote, 'position' | 'label' | 'type'>>;
    }
  >;
  footnotes: Array<Pick<Footnote, 'position' | 'label' | 'type'>>;
  wordsOfJesus?: Array<
    Pick<WordsOfJesus, 'textStart' | 'textEnd' | 'sortOrder' | 'quotationText'>
  >;
};

export type FootnoteData = Pick<Footnote, 'label' | 'type' | 'text'>;
