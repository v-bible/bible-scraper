import { type Page } from 'playwright';

const evalLog = (page: Page) => {
  // @ts-expect-error - Playwright types
  // eslint-disable-next-line no-console
  page.on('console', (msg) => console[msg.type()]('PAGE LOG:', msg.text()));
};

export { evalLog };
