/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
import {
  type Footnote,
  type Heading,
  type Verse,
  type WordsOfJesus,
} from '@prisma/client';
import { uniq } from 'es-toolkit';
import { type VerseData } from '@/@types';

// NOTE: All user-defined regex MUST contains groups mentioned in default
// regexes below
// NOTE: We add "\s" at the beginning because we don't want extra spaces before
// footnotes
const reFnMatch = /\s?<\$(?<fnNum>[^$]*)\$>/gmu;
// NOTE: Base ref match
const reRefMatch = /@\$(?<refLabel>[^$]*)\$@/gmu;
const reHeadMatch = /(?<headingLevel>#+).*\n/gmu;
// NOTE: "\p{L}" is for unicode letter (Vietnamese characters from ktcgkpv.org).
// Example: $1$, $1a$, $ $ and $3-4$. The verseNum will only match the first
// number in "$3-4$" case
const reVerseNumMatch = /\$(?<verseNum>\d+\p{L}*| )(-\d+\p{L}*)?\$/gmu;
// NOTE: This regex is used to match poetry verses. It will match any string
// that ends with "&~".
const rePoetryMatch = /\\?&~$/gmu;
// NOTE: This regex is used to match the words of Jesus in the Gospels.
// It will match: "&$...$&" where "..." is the content of the words of Jesus.
const reWordOfJesusMatch = /&\$(?<woj>[^$]*)\$&/gmu;

class VerseProcessor {
  reFnMatch: RegExp;

  reRefMatch: RegExp;

  reHeadMatch: RegExp;

  reVerseNumMatch: RegExp;

  rePoetryMatch: RegExp;

  reWordOfJesus: RegExp;

  constructor({
    reFn = reFnMatch,
    reRef = reRefMatch,
    reHead = reHeadMatch,
    reVerseNum = reVerseNumMatch,
    rePoetry = rePoetryMatch,
    reWordOfJesus = reWordOfJesusMatch,
  }) {
    this.reFnMatch = reFn;
    this.reRefMatch = reRef;
    this.reHeadMatch = reHead;
    this.reVerseNumMatch = reVerseNum;
    this.rePoetryMatch = rePoetry;
    this.reWordOfJesus = reWordOfJesus;
  }

  processVerse(str: string) {
    const verseNumMatch = this.reVerseNumMatch.exec(str);
    const verseNum = parseInt(verseNumMatch?.groups?.verseNum || '', 10);

    let content = str
      .replaceAll(this.reHeadMatch, '')
      .replaceAll(this.reFnMatch, '')
      .replaceAll(this.reRefMatch, '')
      .replaceAll(this.reVerseNumMatch, '')
      // NOTE: We only remove wrapper not content
      .replaceAll(this.reWordOfJesus, '$1')
      .trim();

    const isPoetry = content.search(this.rePoetryMatch) !== -1;

    if (isPoetry) {
      content = content.replace(this.rePoetryMatch, '');
    }

    return {
      label: verseNumMatch?.[0].replaceAll('$', '') || null,
      number: Number.isNaN(verseNum) ? null : verseNum,
      text: content.trim(),
      isPoetry,
    } satisfies Pick<Verse, 'text' | 'isPoetry'> & {
      label: string | null;
      number: number | null;
    };
  }

  processHeading(str: string) {
    const headingMatch = str
      // NOTE: Catastrophic backtracking might cause freeze
      .match(this.reHeadMatch);

    let headings: Array<
      Pick<Heading, 'text' | 'level' | 'sortOrder'> & {
        footnotes: Array<Pick<Footnote, 'position' | 'label' | 'type'>>;
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
        ).map((fn) => ({
          ...fn,
          type: 'footnote',
        }));

        const refHeadMatch = h
          .replaceAll('#', '')
          .replaceAll(this.reFnMatch, '')
          .trim()
          .matchAll(this.reRefMatch);

        const refHeads = getLabelPosition(refHeadMatch, (match) =>
          match.groups!.refLabel!.replaceAll('\\_', '_'),
        ).map((fn) => ({
          ...fn,
          type: 'reference',
        }));

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
          text: headingContent,
          level: headingLevel,
          sortOrder: headingOrder,
          footnotes: [...fnHeads, ...refHeads],
        };
      });
    }

    return headings satisfies Array<
      Pick<Heading, 'text' | 'level' | 'sortOrder'> & {
        footnotes: Array<Pick<Footnote, 'position' | 'label' | 'type'>>;
      }
    >;
  }

  processVerseFn(str: string) {
    const footnoteMatch = str
      .replaceAll(this.reHeadMatch, '')
      .replaceAll(this.reRefMatch, '')
      .replaceAll(this.reVerseNumMatch, '')
      .replace(this.rePoetryMatch, '')
      // NOTE: We only remove wrapper not content
      .replaceAll(this.reWordOfJesus, '$1')
      .trim()
      .matchAll(this.reFnMatch);

    const footnotes = getLabelPosition(
      footnoteMatch,
      (match) => match.groups!.fnNum!,
    ).map((fn) => ({
      ...fn,
      type: 'footnote',
    }));

    return footnotes satisfies Array<
      Pick<Footnote, 'type' | 'label' | 'position'>
    >;
  }

  processVerseRef(str: string) {
    const referenceMatch = str
      .replaceAll(this.reHeadMatch, '')
      .replaceAll(this.reFnMatch, '')
      .replaceAll(this.reVerseNumMatch, '')
      .replace(this.rePoetryMatch, '')
      // NOTE: We only remove wrapper not content
      .replaceAll(this.reWordOfJesus, '$1')
      .trim()
      .matchAll(this.reRefMatch);

    const refs = getLabelPosition(referenceMatch, (match) =>
      // REVIEW: This is only specific to ktcgkpv.org ref
      match.groups!.refLabel!.replaceAll('\\_', '_'),
    ).map((fn) => ({
      ...fn,
      type: 'reference',
    }));

    return refs satisfies Array<Pick<Footnote, 'type' | 'label' | 'position'>>;
  }

  processVerseWoj(str: string) {
    const wojMatch = str
      .replaceAll(this.reHeadMatch, '')
      .replaceAll(this.reFnMatch, '')
      .replaceAll(this.reRefMatch, '')
      .replaceAll(this.reVerseNumMatch, '')
      .replace(this.rePoetryMatch, '')
      .trim()
      .matchAll(this.reWordOfJesus);

    return [...wojMatch].map((match, idx) => {
      return {
        sortOrder: idx,
        textStart: match.index || 0,
        // NOTE: Use match.groups!.woj!.length to get the length of the
        // quotation text
        textEnd: (match.index || 0) + match.groups!.woj!.length,
        quotationText: match.groups!.woj!,
      };
    }) satisfies Array<
      Pick<
        WordsOfJesus,
        'sortOrder' | 'textStart' | 'textEnd' | 'quotationText'
      >
    >;
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
  }) satisfies Pick<Footnote, 'position' | 'label'>[];
};

const withNormalizeHeadingLevel = (data: VerseData[]) => {
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
  }) satisfies VerseData[];
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
