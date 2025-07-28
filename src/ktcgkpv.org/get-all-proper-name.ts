import { writeFile } from 'fs/promises';
import path from 'path';

const getAllProperName = async () => {
  const req = await fetch('https://ktcgkpv.org/bible/all-transliterations');

  const { data } = await req.json();

  const allProperName = data.map((d: Record<string, string>) => {
    return {
      ...d,
      english: d.english?.replaceAll('<br />', '\n'),
      vietnamese: d.vietnamese?.replaceAll('<br />', '\n'),
    };
  });

  await writeFile(
    path.join(__dirname, '../../dist/proper-name.json'),
    JSON.stringify(allProperName, null, 2),
  );
};

getAllProperName();
