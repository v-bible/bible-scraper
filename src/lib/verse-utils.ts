/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
import { type Heading, type Mark, type Verse } from '@prisma/client';
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
        footnotes: Array<
          Pick<Mark, 'startOffset' | 'endOffset' | 'label' | 'kind'>
        >;
      }
    > = [];

    if (headingMatch !== null) {
      headings = headingMatch.map((h, headingOrder) => {
        const fnHeadMatch = h
          .replaceAll('#', '')
          .replaceAll(this.reRefMatch, '')
          .trim()
          .matchAll(this.reFnMatch);

        const fnHeads = getLabelPosition({
          matches: fnHeadMatch,
          labelSelector: (match) => match.groups!.fnNum!,
        }).map((fn) => ({
          ...fn,
          kind: 'footnote',
          endOffset: fn.startOffset,
        }));

        const refHeadMatch = h
          .replaceAll('#', '')
          .replaceAll(this.reFnMatch, '')
          .trim()
          .matchAll(this.reRefMatch);

        const refHeads = getLabelPosition({
          matches: refHeadMatch,
          labelSelector: (match) =>
            match.groups!.refLabel!.replaceAll('\\_', '_'),
        }).map((fn) => ({
          ...fn,
          kind: 'reference',
          endOffset: fn.startOffset,
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
        footnotes: Array<
          Pick<Mark, 'startOffset' | 'endOffset' | 'label' | 'kind'>
        >;
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

    const footnotes = getLabelPosition({
      matches: footnoteMatch,
      labelSelector: (match) => match.groups!.fnNum!,
    }).map((fn) => ({
      ...fn,
      kind: 'footnote',
      endOffset: fn.startOffset,
    }));

    return footnotes satisfies Array<
      Pick<Mark, 'kind' | 'label' | 'startOffset' | 'endOffset'>
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

    const refs = getLabelPosition({
      matches: referenceMatch,
      labelSelector: (match) =>
        // REVIEW: This is only specific to ktcgkpv.org ref
        match.groups!.refLabel!.replaceAll('\\_', '_'),
    }).map((fn) => ({
      ...fn,
      kind: 'reference',
      endOffset: fn.startOffset,
    }));

    return refs satisfies Array<
      Pick<Mark, 'kind' | 'label' | 'startOffset' | 'endOffset'>
    >;
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

    const woj = getLabelPosition({
      matches: wojMatch,
      labelSelector: (match) => match.groups!.woj!,
      // NOTE: We don't remove the woj label later so set keepLabel to true
      keepLabel: true,
    }).map((wojItem, idx) => {
      return {
        sortOrder: idx,
        startOffset: wojItem.startOffset,
        endOffset: wojItem.startOffset + wojItem.label.length,
        content: wojItem.label,
      };
    });

    return woj satisfies Array<
      Pick<Mark, 'sortOrder' | 'startOffset' | 'endOffset' | 'content'>
    >;
  }
}

const getLabelPosition = ({
  matches,
  labelSelector,
  keepLabel = false,
}: {
  matches: IterableIterator<RegExpExecArray>;
  labelSelector: (match: RegExpExecArray) => string;
  keepLabel?: boolean;
}) => {
  return [...matches].map((matchVal, idx, arr) => {
    const labelStr = labelSelector(matchVal);

    if (idx === 0) {
      return {
        startOffset: matchVal.index,
        label: labelStr,
      };
    }

    let previousLength = 0;
    const previousMatch = arr.slice(0, idx);
    // NOTE: This will calculate the length of all previous matches, for some
    // cases like footnote and ref the label will be removed later, but some
    // cases like woj we need to keep label so we add back the label length
    for (const match of previousMatch) {
      // NOTE: We want the whole string match so get the zero index
      previousLength += match[0].length;

      if (keepLabel) {
        previousLength -= labelSelector(match).length; // Include the current match length
      }
    }

    return {
      // NOTE: We minus previousLength to get the correct position because the
      // current match also includes the previous matches
      startOffset: matchVal.index - previousLength,
      label: labelStr,
    };
  }) satisfies Pick<Mark, 'startOffset' | 'label'>[];
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
