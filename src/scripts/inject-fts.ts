import path from 'path';
import { generateFTSIndex } from '@/lib/inject-fts';

const main = async () => {
  const versionCode = 'KT2011';

  await generateFTSIndex(
    path.join(
      __dirname,
      '../../dist',
      `${versionCode.toLowerCase()}_fts.sqlite3`,
    ),
  );
};

main();
