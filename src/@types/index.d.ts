import type {
  BookFootnote,
  BookHeading,
  BookReference,
  BookVerse,
} from '@prisma/client';

export type VerseData = {
  verse: Pick<
    BookVerse,
    'content' | 'number' | 'order' | 'isPoetry' | 'parIndex' | 'parNumber'
  >;
  headings: Array<
    Pick<BookHeading, 'content' | 'level' | 'order'> & {
      footnotes: Array<Pick<BookFootnote, 'position'> & { label: string }>;
      references: Array<Pick<BookReference, 'position'> & { label: string }>;
    }
  >;
  footnotes: Array<Pick<BookFootnote, 'position'> & { label: string }>;
  references: Array<Pick<BookReference, 'position'> & { label: string }>;
};
