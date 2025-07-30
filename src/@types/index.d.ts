import { type Footnote, type Heading, type Verse } from '@prisma/client';

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
};

export type FootnoteData = Pick<Footnote, 'label' | 'type' | 'text'>;
