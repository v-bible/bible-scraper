/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
import type {
  BookFootnote,
  BookHeading,
  BookReference,
  BookVerse,
} from '@prisma/client';

const reFnMatch = /\s?<\$(?<fnNum>[^$]*)\$>/gu;
const reRefMatch = /@(?<refLabel>ci\d+_[^_]+_[^&]+)&\$[^@]*\$@/gu;
const reHeadMatch = /#[^#]*#/gu;
const reVerseNumMatch = /\$(?<verseNum>\d+\p{L}*)\$/gu;

const processVerse = (str: string) => {
  let content = str
    .replaceAll(reHeadMatch, '')
    .replaceAll(reFnMatch, '')
    .replaceAll(reRefMatch, '')
    .replaceAll(reVerseNumMatch, '');

  const isPoetry = content.includes('~');

  if (isPoetry) {
    content = content.replace('~', '');
  }

  return {
    content: content.trim(),
    isPoetry,
  } satisfies Pick<BookVerse, 'content' | 'isPoetry'>;
};

const processHeading = (str: string) => {
  const headingMatch = str
    // NOTE: Catastrophic backtracking might cause freeze
    .match(reHeadMatch);

  let headings: Array<
    Pick<BookHeading, 'content' | 'order'> & {
      footnotes: Array<Pick<BookFootnote, 'position'> & { label: string }>;
      references: Array<Pick<BookReference, 'position'> & { label: string }>;
    }
  > = [];

  if (headingMatch !== null) {
    headings = headingMatch.map((h, headingOrder) => {
      const fnHeadMatch = h
        .replaceAll('#', '')
        .replaceAll(reRefMatch, '')
        .trim()
        .matchAll(reFnMatch);

      const fnHeads = calcPosition(
        fnHeadMatch,
        (match) => match.groups!.fnNum!,
      );

      const refHeadMatch = h
        .replaceAll('#', '')
        .replaceAll(reFnMatch, '')
        .trim()
        .matchAll(reRefMatch);

      const refHeads = calcPosition(
        refHeadMatch,
        (match) => match.groups!.refLabel!,
      );

      const headingContent = h
        .replaceAll(reFnMatch, '')
        .replaceAll(reRefMatch, '')
        .replaceAll('#', '')
        .trim();

      return {
        content: headingContent,
        order: headingOrder,
        footnotes: fnHeads,
        references: refHeads,
      };
    });
  }

  return headings;
};

const processVerseFn = (str: string, regex: RegExp = reFnMatch) => {
  const footnoteMatch = str
    .replaceAll(reHeadMatch, '')
    .replaceAll(reRefMatch, '')
    .replaceAll(reVerseNumMatch, '')
    .replace('~', '')
    .trim()
    .matchAll(regex);

  const footnotes = calcPosition(
    footnoteMatch,
    (match) => match.groups!.fnNum!,
  );

  return footnotes;
};

const processVerseRef = (str: string, regex: RegExp = reRefMatch) => {
  const referenceMatch = str
    .replaceAll(reHeadMatch, '')
    .replaceAll(reFnMatch, '')
    .replaceAll(reVerseNumMatch, '')
    .replace('~', '')
    .trim()
    .matchAll(regex);

  const refs = calcPosition(referenceMatch, (match) => match.groups!.refLabel!);

  return refs;
};

const calcPosition = (
  matches: IterableIterator<RegExpExecArray>,
  labelSelector: (match: RegExpExecArray) => string,
) => {
  return [...matches].map((matchVal, idx, arr) => {
    if (idx === 0) {
      return {
        position: matchVal.index,
        label: labelSelector(matchVal),
      };
    }

    let previousLength = 0;
    // NOTE: We want the whole string match so get the zero index
    const previousMatch = arr.slice(0, idx).map((match) => match['0']);
    for (const match of previousMatch) {
      previousLength += match.length;
    }

    return {
      position: matchVal.index - previousLength,
      label: labelSelector(matchVal),
    };
  });
};

export {
  processVerse,
  processHeading,
  processVerseFn,
  processVerseRef,
  calcPosition,
  reFnMatch,
  reRefMatch,
  reHeadMatch,
  reVerseNumMatch,
};
