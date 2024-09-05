/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Prisma } from '@prisma/client';
import { chromium, devices } from 'playwright';
import { getParagraph } from '@/ktcgkpv/get-paragraph';
import { getVerse } from '@/ktcgkpv/get-verse';
import { bookCodeList, versionMapping } from '@/ktcgkpv/mapping';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';

const getAll = async (
  chap: Prisma.BookChapterGetPayload<{
    include: {
      book: true;
    };
  }>,
) => {
  const formdata = new FormData();
  formdata.append('version', `${versionMapping.KT2011.number}`);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  formdata.append('book', `${bookCodeList[chap.book.code]}`);
  formdata.append('book_abbr', chap.book.code);
  formdata.append('from_chapter', `${chap.number}`);
  formdata.append('to_chapter', `${chap.number}`);

  const req = await fetch('https://ktcgkpv.org/bible/content-view', {
    method: 'POST',
    body: formdata,
    redirect: 'follow',
  });

  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  const data = await req.json();

  await page.setContent(data.data.content, {
    waitUntil: 'load',
  });

  const allVerses = await page
    .locator("sup[class*='verse-num' i]")
    .allTextContents();

  await context.close();
  await browser.close();

  // NOTE: We will not iterate from the verseNumCount because we want to get all
  // verses
  const verseData = await Promise.all(
    allVerses.map(async (verseNum) => {
      const verseFormData = new FormData();
      verseFormData.append('version', `${versionMapping.KT2011.number}`);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      verseFormData.append('book', `${bookCodeList[chap.book.code]}`);
      verseFormData.append('book_abbr', chap.book.code);
      verseFormData.append('from_chapter', `${chap.number}`);
      verseFormData.append('to_chapter', `${chap.number}`);
      verseFormData.append('from_verse', `${verseNum}`);
      verseFormData.append('to_verse', `${verseNum}`);

      const verReq = await fetch('https://ktcgkpv.org/bible/content-view', {
        method: 'POST',
        body: verseFormData,
        redirect: 'follow',
      });

      const verseContent = await verReq.json();

      return {
        number: verseNum,
        data: await getVerse(verseContent.data.content),
      };
    }),
  );

  const paragraphs = await getParagraph(chap);

  const footnoteContentMap: Record<string, string> = Object.entries(
    data.data?.notes || {},
  ).reduce((acc, [key, noteContent]) => {
    return {
      ...acc,
      [key.split('_').at(-1) as string]: noteContent,
    };
  }, {});

  let footnoteOrder = 0;
  let refOrder = 0;
  // NOTE: We ensure that the order of split verses like '4a', '4b', '4c' is
  // correct
  const verseOrderTrack = {
    number: 0,
    order: 0,
  };

  for (let parNumber = 0; parNumber < paragraphs.length; parNumber += 1) {
    for (
      let parIndex = 0;
      parIndex < paragraphs[parNumber]!.length;
      parIndex += 1
    ) {
      const verseDataIdx = verseData
        .filter((v) => v.number === paragraphs[parNumber]![parIndex])
        .at(0);

      if (!verseDataIdx?.data) {
        continue;
      }

      for (const vData of verseDataIdx.data) {
        if (vData.verse.number !== verseOrderTrack.number) {
          verseOrderTrack.number = vData.verse.number;
          verseOrderTrack.order = 0;
        } else {
          verseOrderTrack.order += 1;
        }

        const newVerse = await prisma.bookVerse.upsert({
          where: {
            number_order_chapterId: {
              number: verseOrderTrack.number,
              order: verseOrderTrack.order,
              chapterId: chap.id,
            },
          },
          update: {
            number: verseOrderTrack.number,
            content: vData.verse.content,
            order: verseOrderTrack.order,
            parNumber,
            parIndex,
            isPoetry: vData.verse.isPoetry,
          },
          create: {
            number: verseOrderTrack.number,
            content: vData.verse.content,
            order: verseOrderTrack.order,
            parNumber,
            parIndex,
            isPoetry: vData.verse.isPoetry,
            chapterId: chap.id,
          },
        });

        logger.info(
          'Get verse %s:%s for book %s',
          chap.number,
          vData.verse.number,
          chap.book.title,
        );

        logger.debug(
          'Verse %s:%s content: %s',
          chap.number,
          vData.verse.number,
          vData.verse.content,
        );

        if (vData.verse.isPoetry) {
          logger.info(
            'Verse %s:%s is poetry for book %s',
            chap.number,
            vData.verse.number,
            chap.book.title,
          );
        }

        for (const vHeading of vData.headings) {
          const newHeading = await prisma.bookHeading.upsert({
            where: {
              order_verseId: {
                order: vHeading.order,
                verseId: newVerse.id,
              },
            },
            update: {
              order: vHeading.order,
              content: vHeading.content,
            },
            create: {
              order: vHeading.order,
              content: vHeading.content,
              verseId: newVerse.id,
              chapterId: chap.id,
            },
          });

          logger.info(
            'Get heading %s:%s for book %s',
            chap.number,
            vData.verse.number,
            chap.book.title,
          );

          logger.debug(
            'Heading %s:%s content: %s',
            chap.number,
            vData.verse.number,
            vHeading.content,
          );

          for (const hFootnote of vHeading.footnotes) {
            const hFootnoteContent = footnoteContentMap[hFootnote.label];

            // NOTE: Sometimes footnote is not present
            if (!hFootnoteContent) {
              continue;
            }

            await prisma.bookFootnote.upsert({
              where: {
                order_headingId: {
                  order: footnoteOrder,
                  headingId: newHeading.id,
                },
              },
              update: {
                order: footnoteOrder,
                content: hFootnoteContent,
                position: hFootnote.position,
              },
              create: {
                order: footnoteOrder,
                content: hFootnoteContent,
                position: hFootnote.position,
                headingId: newHeading.id,
                chapterId: chap.id,
              },
            });

            logger.info(
              'Get heading footnote %s:%s for book %s',
              chap.number,
              vData.verse.number,
              chap.book.title,
            );

            logger.debug(
              'Heading footnote %s:%s content: %s',
              chap.number,
              vData.verse.number,
              footnoteContentMap[hFootnote.label],
            );

            footnoteOrder += 1;
          }

          for (const hRef of vHeading.references) {
            const refContent = data.data?.references[hRef.label]
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              ?.map((v) => v.display_text)
              .join('; ');

            if (!refContent) {
              continue;
            }

            await prisma.bookReference.upsert({
              where: {
                order_headingId: {
                  order: refOrder,
                  headingId: newHeading.id,
                },
              },
              update: {
                order: refOrder,
                content: refContent,
                position: hRef.position,
              },
              create: {
                order: refOrder,
                content: refContent,
                position: hRef.position,
                headingId: newHeading.id,
                chapterId: chap.id,
              },
            });

            logger.info(
              'Get heading reference %s:%s for book %s',
              chap.number,
              vData.verse.number,
              chap.book.title,
            );

            logger.debug(
              'Heading reference %s:%s content: %s',
              chap.number,
              vData.verse.number,
              refContent,
            );

            refOrder += 1;
          }
        }

        for (const vFootnote of vData.footnotes) {
          const vFootnoteContent = footnoteContentMap[vFootnote.label];

          // NOTE: Sometimes footnote is not present
          if (!vFootnoteContent) {
            continue;
          }

          await prisma.bookFootnote.upsert({
            where: {
              order_verseId: {
                order: footnoteOrder,
                verseId: newVerse.id,
              },
            },
            update: {
              order: footnoteOrder,
              content: vFootnoteContent,
              position: vFootnote.position,
            },
            create: {
              order: footnoteOrder,
              content: vFootnoteContent,
              position: vFootnote.position,
              verseId: newVerse.id,
              chapterId: chap.id,
            },
          });

          logger.info(
            'Get footnote %s:%s for book %s',
            chap.number,
            vData.verse.number,
            chap.book.title,
          );

          logger.debug(
            'Footnote %s:%s content: %s',
            chap.number,
            vData.verse.number,
            footnoteContentMap[vFootnote.label],
          );

          footnoteOrder += 1;
        }

        for (const vRef of vData.references) {
          const refContent = data.data?.references[vRef.label]
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            ?.map((v) => v.display_text)
            .join('; ');

          if (!refContent) {
            continue;
          }

          await prisma.bookReference.upsert({
            where: {
              order_verseId: {
                order: refOrder,
                verseId: newVerse.id,
              },
            },
            update: {
              order: refOrder,
              content: refContent,
              position: vRef.position,
            },
            create: {
              order: refOrder,
              content: refContent,
              position: vRef.position,
              verseId: newVerse.id,
              chapterId: chap.id,
            },
          });

          logger.info(
            'Get reference %s:%s for book %s',
            chap.number,
            vData.verse.number,
            chap.book.title,
          );

          logger.debug(
            'Reference %s:%s content: %s',
            chap.number,
            vData.verse.number,
            refContent,
          );

          refOrder += 1;
        }
      }
    }
  }
};

export { getAll };
