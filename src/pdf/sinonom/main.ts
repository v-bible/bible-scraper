import { writeFile } from 'fs/promises';
import path from 'path';
import { uniqBy } from 'es-toolkit';
import { extractTextFromPDf } from '@/lib/processPDf';

(async () => {
  const fileName = path.join(path.dirname(__filename), 'sinonom_dict.pdf');

  // REVIEW: There are some cases nom characters are resolved into multiple ones,
  // which I guess is not correct?
  // REVIEW: Some cases will have spaces between characters, e.g.: "R ấ t Th á
  // nh Trái Tim Đ ứ c Ch ú a Giê-su"
  const data = await extractTextFromPDf(fileName);

  let corpus = data
    .flatMap((d) => {
      // NOTE:
      // vietnames group:
      // [\u0041-\u005A\u0061-\u007A] → A-Z, a-z
      // \u00C0-\u024F → Latin có dấu (Â, Ê, ă, đ, etc.)
      // \u1E00-\u1EF9 → Ký tự Latin có dấu mở rộng (gồm đầy đủ các dấu tiếng
      // Việt)
      // nom group:
      // \u3400-\u4DBF: CJK Unified Ideographs Extension A
      // \u4E00-\u9FFF: CJK Unified Ideographs
      // \uF900-\uFAFF: CJK Compatibility Ideographs
      // \u{20000}-\u{2EBEF}: CJK Unified Ideographs Extensions B–F (sử dụng cú
      // pháp Unicode mở rộng, cần trình regex hỗ trợ \u{} như JavaScript ES6+
      // hoặc ICU)
      const regex =
        /(?<vietnamese>[\u0041-\u005A\u0061-\u007A\u00C0-\u024F\u1E00-\u1EF9 -]+)\s\((?<nom>[\u3400-\u9FFF\uF900-\uFAFF\u{20000}-\u{2EBEF} ]+)\)(:\s(?<wordType>§\p{L}+).)?/gmu;

      const matches = [...d.text.matchAll(regex)];

      return matches.map((match) => {
        const { vietnamese = '', nom = '', wordType = '' } = match.groups || {};
        return {
          vietnamese: vietnamese.trim(),
          nom: nom.trim(),
          wordType: wordType.trim(),
        };
      });
    })
    .filter((d) => d !== null);

  corpus = uniqBy(corpus, (item) => item.nom);

  const csv = `vietnamese,nom,wordType\n${corpus
    .map((d) => `${d.vietnamese},${d.nom},${d.wordType}`)
    .join('\n')}`;

  await writeFile(path.join(path.dirname(__filename), 'corpus.csv'), csv);
})();
