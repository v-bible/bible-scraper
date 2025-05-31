/* eslint-disable no-restricted-syntax */
import retry from 'async-retry';
import { format, parse } from 'date-fns';
import { chromium, devices } from 'playwright';

const exportCSV = (
  data: {
    title: string;
    link: string;
    publisher: string;
    publishDate: Date;
  }[],
) => {
  const csv =
    'STT;Tên;Nhóm;Tác giả;Thể loại;Định dạng;Link;Nguồn;Thế kỷ;Thời gian;Ghi chú\n';

  const csvContent = data
    .map((item, index) => {
      const fmtDate = format(item.publishDate, 'dd/MM/yyyy');

      return `${index + 1};${item.title.trim()};"";${item.publisher};Bài viết;Web;${item.link.trim()};https://thanhlinh.net/;21;${fmtDate};""`;
    })
    .join('\n');

  const fullCsv = csv + csvContent;

  return fullCsv;
};

const posts = [
  // 'https://thanhlinh.net/vi/phung-vu/mua-vong',
  // 'https://thanhlinh.net/vi/phung-vu/mua-giang-sinh',
  'https://thanhlinh.net/vi/phung-vu/mua-phuc-sinh',
  // 'https://thanhlinh.net/vi/phung-vu/le-lon',
  // 'https://thanhlinh.net/vi/phung-vu/nam-thanh',
  // 'https://thanhlinh.net/vi/phung-vu/tong-hop',
  // 'https://thanhlinh.net/vi/phung-vu/mua-chay-tuan-thanh',
  // 'https://thanhlinh.net/vi/phung-vu/mua-thuong-nien',
  // 'https://thanhlinh.net/vi/cau-nguyen/kinh-nguyen-tieng-viet',
];

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

  const data = await Promise.all(
    articles.map(async (item) => {
      const title = await item.locator('a').textContent();
      const href = await item.locator('a').getAttribute('href');

      const newLink = `https://thanhlinh.net${href}`;
      console.log('newLink', newLink);

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

      return {
        title: title || '',
        link: newLink || '',
        publisher: publisher || '',
        publishDate,
      };
    }),
  );

  await context.close();
  await browser.close();

  return data.filter((item) => item !== null);
};

(async () => {
  const data = [];

  for await (const link of posts) {
    const result = await fetchPosts(link);
    data.push(result);
  }

  const csv = exportCSV(data.flat());
  console.log(csv);
})();
