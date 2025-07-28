/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
import type {
  BookFootnote,
  BookHeading,
  BookReference,
  BookVerse,
} from '@prisma/client';
import { uniq } from 'es-toolkit';
import { type VData } from '@/ktcgkpv.org/get-verse';

// NOTE: All user-defined regex MUST contains groups mentioned in default
// regexes below
// NOTE: We add "\s" at the beginning because we don't want extra spaces before
// footnotes
const reFnMatch = /\s?<\$(?<fnNum>[^$]*)\$>/gmu;
// NOTE: This is for ktcgkpv.org ref type
const reRefMatch = /@(?<refLabel>ci\d+\\?_[^_]+\\?_[^&]+)&\$[^@]*\$@/gmu;
const reHeadMatch = /(?<headingLevel>#+).*\n/gmu;
// NOTE: "\p{L}" is for unicode letter (Vietnamese characters from ktcgkpv.org)
const reVerseNumMatch = /\$(?<verseNum>\d+\p{L}*)\$/gmu;
const rePoetryMatch = /\\?~/gmu;

class VerseProcessor {
  reFnMatch: RegExp;

  reRefMatch: RegExp;

  reHeadMatch: RegExp;

  reVerseNumMatch: RegExp;

  rePoetryMatch: RegExp;

  constructor({
    reFn = reFnMatch,
    reRef = reRefMatch,
    reHead = reHeadMatch,
    reVerseNum = reVerseNumMatch,
    rePoetry = rePoetryMatch,
  }) {
    this.reFnMatch = reFn;
    this.reRefMatch = reRef;
    this.reHeadMatch = reHead;
    this.reVerseNumMatch = reVerseNum;
    this.rePoetryMatch = rePoetry;
  }

  processVerse(str: string) {
    let content = str
      .replaceAll(this.reHeadMatch, '')
      .replaceAll(this.reFnMatch, '')
      .replaceAll(this.reRefMatch, '')
      .replaceAll(this.reVerseNumMatch, '');

    const isPoetry = content.search(this.rePoetryMatch) !== -1;

    if (isPoetry) {
      content = content.replace(this.rePoetryMatch, '');
    }

    return {
      content: content.trim(),
      isPoetry,
    } satisfies Pick<BookVerse, 'content' | 'isPoetry'>;
  }

  processHeading(str: string) {
    const headingMatch = str
      // NOTE: Catastrophic backtracking might cause freeze
      .match(this.reHeadMatch);

    let headings: Array<
      Pick<BookHeading, 'content' | 'level' | 'order'> & {
        footnotes: Array<Pick<BookFootnote, 'position'> & { label: string }>;
        references: Array<Pick<BookReference, 'position'> & { label: string }>;
      }
    > = [];

    if (headingMatch !== null) {
      headings = headingMatch.map((h, headingOrder) => {
        const fnHeadMatch = h
          .replaceAll('#', '')
          .replaceAll(this.reRefMatch, '')
          .trim()
          .matchAll(this.reFnMatch);

        const fnHeads = getLabelPosition(
          fnHeadMatch,
          (match) => match.groups!.fnNum!,
        );

        const refHeadMatch = h
          .replaceAll('#', '')
          .replaceAll(this.reFnMatch, '')
          .trim()
          .matchAll(this.reRefMatch);

        const refHeads = getLabelPosition(refHeadMatch, (match) =>
          match.groups!.refLabel!.replaceAll('\\_', '_'),
        );

        const headingContent = h
          .replaceAll(this.reFnMatch, '')
          .replaceAll(this.reRefMatch, '')
          .replaceAll('#', '')
          .trim();

        // NOTE: We want to get the number of '#' to determine the level of the
        // heading in the content
        // NOTE: Heading level starts from 1
        const headingLevel =
          [...h.matchAll(this.reHeadMatch)].at(0)?.groups?.headingLevel
            ?.length || 1;

        return {
          content: headingContent,
          level: headingLevel,
          order: headingOrder,
          footnotes: fnHeads,
          references: refHeads,
        };
      });
    }

    return headings;
  }

  processVerseFn(str: string) {
    const footnoteMatch = str
      .replaceAll(this.reHeadMatch, '')
      .replaceAll(this.reRefMatch, '')
      .replaceAll(this.reVerseNumMatch, '')
      .replace(this.rePoetryMatch, '')
      .trim()
      .matchAll(this.reFnMatch);

    const footnotes = getLabelPosition(
      footnoteMatch,
      (match) => match.groups!.fnNum!,
    );

    return footnotes;
  }

  processVerseRef(str: string) {
    const referenceMatch = str
      .replaceAll(this.reHeadMatch, '')
      .replaceAll(this.reFnMatch, '')
      .replaceAll(this.reVerseNumMatch, '')
      .replace(this.rePoetryMatch, '')
      .trim()
      .matchAll(this.reRefMatch);

    const refs = getLabelPosition(referenceMatch, (match) =>
      // REVIEW: This is only specific to ktcgkpv.org ref
      match.groups!.refLabel!.replaceAll('\\_', '_'),
    );

    return refs;
  }
}

const getLabelPosition = (
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
      // NOTE: We minus previousLength to get the correct position because the
      // current match also includes the previous matches
      position: matchVal.index - previousLength,
      label: labelSelector(matchVal),
    };
  });
};

const withNormalizeHeadingLevel = (data: VData[]) => {
  const levels = data
    .map((d) => d.headings)
    .flat()
    .map((h) => h.level)
    .toSorted();
  const normalizedLevels = uniq(levels).map((level, idx) => {
    return {
      level,
      normalizedLevel: idx + 1,
    };
  });

  return data.map((d) => {
    const newHeadings = d.headings.map((h) => {
      const normalizedLevel = normalizedLevels.find(
        (level) => level.level === h.level,
      )?.normalizedLevel;

      return {
        ...h,
        level: normalizedLevel || h.level,
      };
    });

    return {
      ...d,
      headings: newHeadings,
    };
  });
};

export {
  VerseProcessor,
  getLabelPosition,
  withNormalizeHeadingLevel,
  reFnMatch,
  reRefMatch,
  reHeadMatch,
  reVerseNumMatch,
};
