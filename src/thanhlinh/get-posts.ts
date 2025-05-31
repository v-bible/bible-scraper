/* eslint-disable no-restricted-syntax */
import { appendFile, writeFile } from 'node:fs/promises';
import retry from 'async-retry';
import { format, parse } from 'date-fns';
import { chromium, devices } from 'playwright';
import { logger } from '@/logger/logger';

const posts = [
  'https://thanhlinh.net/vi/me-maria/bai-viet-ve-me',
  'https://thanhlinh.net/vi/me-maria/tai-lieu-ve-me-maria',
  'https://thanhlinh.net/vi/me-maria/duc-me-medu',
  'https://thanhlinh.net/vi/me-maria/duc-me-ho-lua',
  'https://thanhlinh.net/vi/me-maria/duc-me-akita',
  'https://thanhlinh.net/vi/me-maria/duc-me-fatima',
  'https://thanhlinh.net/vi/phung-vu/mua-vong',
  'https://thanhlinh.net/vi/phung-vu/mua-giang-sinh',
  'https://thanhlinh.net/vi/phung-vu/mua-phuc-sinh',
  'https://thanhlinh.net/vi/phung-vu/le-lon',
  'https://thanhlinh.net/vi/phung-vu/nam-thanh',
  'https://thanhlinh.net/vi/phung-vu/tong-hop',
  'https://thanhlinh.net/vi/phung-vu/mua-chay-tuan-thanh',
  'https://thanhlinh.net/vi/phung-vu/mua-thuong-nien',
  'https://thanhlinh.net/vi/cau-nguyen/kinh-nguyen-tieng-viet',
];

const getPostPageNumber = async (link: string) => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  logger.info(`Fetching page number for link: ${link}`);

  await retry(
    async () => {
      await page.goto(link, {
        timeout: 36000, // In milliseconds is 36 seconds
      });
    },
    {
      retries: 5,
    },
  );

  const isVisible = (await page.locator('ul[class*="pagination"]').count()) > 0;

  if (!isVisible) {
    logger.warn(`Pagination not found for link: ${link}`);
    await context.close();
    await browser.close();
    return 0;
  }

  const pagination = await page
    .locator('ul[class*="pagination"]')
    .locator('a[title="Đến trang cuối cùng" i]')
    .getAttribute('href');

  await context.close();
  await browser.close();

  if (!pagination) {
    return 0;
  }

  const pageNumber = Number(pagination.split('=')[1]);

  return pageNumber;
};
const fetchPosts = async (link: string) => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  await retry(
    async () => {
      await page.goto(link, {
        timeout: 36000, // In milliseconds is 36 seconds
      });
    },
    {
      retries: 5,
    },
  );

  const articles = await page
    .locator('ul[class="vertical-news"]')
    .locator('li')
    .all();

  for await (const item of articles) {
    const title = await item.locator('a').textContent();
    const href = await item.locator('a').getAttribute('href');

    const newLink = `https://thanhlinh.net${href}`;

    const newPage = await context.newPage();

    await retry(
      async () => {
        await newPage.goto(newLink, {
          timeout: 36000, // In milliseconds is 36 seconds
        });
      },
      {
        retries: 10,
      },
    );

    const date = (
      await newPage
        .locator('div[class="article-inner"]')
        .locator('ul')
        .locator('li')
        .nth(0)
        .textContent()
    )?.trim();
    const publisher = (
      await newPage
        .locator('div[class="article-inner"]')
        .locator('ul')
        .locator('li')
        .nth(1)
        .textContent()
    )?.trim();

    await newPage.close();

    const publishDate = date
      ? parse(date.slice(4, 14), 'dd/MM/yyyy', new Date())
      : new Date();

    const fmtDate = format(publishDate, 'dd/MM/yyyy');

    logger.info(
      `Fetched post: ${title} - ${newLink} - ${fmtDate} - ${publisher} - ${fmtDate}`,
    );

    await appendFile(
      'thanhlinh-posts.csv',
      `"";${(title || '').trim()};"";${publisher};Bài viết;Web;${newLink.trim()};https://thanhlinh.net/;21;${fmtDate};""`,
    );
  }

  await context.close();
  await browser.close();
};

(async () => {
  await writeFile(
    'thanhlinh-posts.csv',
    'STT;Tên;Nhóm;Tác giả;Thể loại;Định dạng;Link;Nguồn;Thế kỷ;Thời gian;Ghi chú\n',
  );

  for await (const link of posts) {
    const pageNumber = await getPostPageNumber(link);

    for (let i = 0; i <= pageNumber; i += 1) {
      const pageLink = `${link}?page=${i}`;

      logger.info(`Fetching posts from: ${pageLink}`);

      // eslint-disable-next-line no-await-in-loop
      await fetchPosts(pageLink);
    }
  }
})();
