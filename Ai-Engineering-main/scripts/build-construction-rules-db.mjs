import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'src', 'data', 'constructionRulesCatalog.json');
const families = ['10', '11', '14', '21', '31', '32', '41', '44', '47', '51'];
const records = families.flatMap((family) => ['KDS', 'KCS'].map((type) => ({
  code: `${type} ${family} 00 00`,
  standardType: type,
  sourceUrl: 'https://www.codil.or.kr/',
  publisher: '국가건설기준센터',
  sourceStatus: 'SOURCE_ONLY',
  note: '공식 기준서 목록에서 세부 원문 URL을 확인한 뒤 조문 단위로 수집해야 합니다.',
})));
await fs.writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), records }, null, 2), 'utf8');
console.log(`Wrote ${records.length} KDS/KCS source catalog records to ${output}`);
