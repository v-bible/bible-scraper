/* eslint-disable no-restricted-syntax */
import { format, parse } from 'date-fns';
import { chromium, devices } from 'playwright';

const exportCSV = (
  data: {
    title: string;
    link: string;
    publishDate: Date;
  }[],
) => {
  const csv =
    'STT,Tên,Nhóm,Tác giả,Thể loại,Định dạng,Link,Nguồn,Thế kỷ,Thời gian,Ghi chú\n';

  const csvContent = data
    .map((item, index) => {
      const fmtDate = format(item.publishDate, 'dd/MM/yyyy');

      return `${index + 1},${item.title.trim()},"","",Giáo lý/Giáo huấn,Web,${item.link.trim()},https://dongten.net/,21,${fmtDate},""`;
    })
    .join('\n');

  const fullCsv = csv + csvContent;

  return fullCsv;
};

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  await page.goto('https://dongten.net/category/hoi-dap-cong-giao/');

  const articles = await page.locator('article[class="item-list"]').all();

  const data = await Promise.all(
    articles.map(async (item) => {
      const title = await item.locator('h2').textContent();
      const link = await item.locator('h2').locator('a').getAttribute('href');

      const publishDateStr = await item
        .locator('span[class="tie-date"]')
        .textContent();

      if (!publishDateStr) {
        console.log('No publish date found for this article.');
        // eslint-disable-next-line no-continue
        return null;
      }

      const publishDate = parse(publishDateStr, 'd MMMM, y', new Date());

      return {
        title: title || '',
        link: link || '',
        publishDate,
      };
    }),
  );

  const filterData = data.filter((item) => item !== null);

  const csv = exportCSV(filterData);
  console.log('csv', csv);

  await context.close();
  await browser.close();
})();
