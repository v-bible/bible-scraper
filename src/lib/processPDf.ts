import { groupBy } from 'es-toolkit';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const textCleanup = (text: string) => {
  return text
    .replaceAll(/ {2,}/gm, ' ')
    .replaceAll('( ', '(')
    .replaceAll(' )', ')')
    .replaceAll(' .', '.')
    .trim();
};

const extractTextFromPDf = async (
  src: string,
  options?: {
    paragraphSpacing?: number;
    pageNumber?: number;
  },
) => {
  const defaultOptions = {
    paragraphSpacing: 18,
  };

  const doc = await getDocument(src).promise;

  const { numPages } = doc;

  const totalPages = options?.pageNumber || numPages;

  const data: {
    text: string;
    pageNumber: number;
  }[] = [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-restricted-syntax
  for await (const pageNumber of Array(totalPages).keys()) {
    const page = await doc.getPage(pageNumber + 1);

    const content = await page.getTextContent();

    const items = content.items
      .map((item) => {
        if ('str' in item && typeof item.str === 'string') {
          return item;
        }
        return null;
      })
      .filter((i) => i !== null);

    const groupByLines = groupBy(items, (item) => {
      const byLine = item.transform.at(5);

      return byLine;
    });

    const textByLine = Object.keys(groupByLines).map((key) => {
      const strList =
        groupByLines[key]?.map((item) => item.str).join(' ') || '';

      return {
        y: +key,
        str: textCleanup(strList),
      };
    });

    let joinText = '';

    textByLine.forEach((line, idx, array) => {
      const prevY = array[idx - 1]?.y;
      const currY = line.y;

      const lineSpacing = prevY ? Math.abs(+prevY - +currY) : 0;

      if (
        lineSpacing >
        (options?.paragraphSpacing || defaultOptions.paragraphSpacing)
      ) {
        joinText += `\n\n${line.str}`;
      } else if (
        lineSpacing <=
          (options?.paragraphSpacing || defaultOptions.paragraphSpacing) &&
        idx > 0
      ) {
        joinText += `\n${line.str}`;
      } else {
        joinText += line.str;
      }
    });

    data.push({
      text: joinText,
      pageNumber: pageNumber + 1,
    });
  }

  return data;
};

export { extractTextFromPDf };
