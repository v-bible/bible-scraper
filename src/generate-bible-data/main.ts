import {
  generateBibleData,
  presets,
} from '@/generate-bible-data/generate-data';

(async () => {
  await generateBibleData(presets['ktcgkpv.org'], 'http://localhost:8081/api');
})();
