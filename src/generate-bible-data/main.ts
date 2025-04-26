import {
  generateBibleData,
  presets,
} from '@/generate-bible-data/generate-data';

(async () => {
  await generateBibleData(presets.ktcgkpv, 'http://localhost:8081/api');
})();
