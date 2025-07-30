import { type Footnote, type Heading, type Verse } from '@prisma/client';

export type VerseData = {
  verse: Pick<
    Verse,
    'text' | 'number' | 'subVerseIndex' | 'isPoetry' | 'paragraphNumber'
  >;
  headings: Array<
    Pick<Heading, 'text' | 'level' | 'sortOrder'> & {
      footnotes: Array<Pick<Footnote, 'position'> & { label: string }>;
    }
  >;
  footnotes: Array<Pick<Footnote, 'position'> & { label: string }>;
};
