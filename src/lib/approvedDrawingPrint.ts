import { PDFDocument, StandardFonts, rgb, pushGraphicsState, popGraphicsState, concatTransformationMatrix } from 'pdf-lib';
import type { ReviewItem } from '../types';

export async function createApprovedDrawingPdf(reviews: ReviewItem[], issuedAt = new Date()): Promise<Uint8Array> {
  if (!reviews.length) throw new Error('출력할 원본 도면이 없습니다.');
  const output = await PDFDocument.create();
  const seen = new Set<string>();
  for (const review of reviews) {
    const id = review.documentId || review.id;
    if (seen.has(id)) continue;
    seen.add(id);
    const source = review.fileDataUrl || review.cadUrl;
    if (!source) throw new Error(review.fileName + ': 원본 도면이 없습니다.');
    const response = await fetch(source);
    if (!response.ok) throw new Error(review.fileName + ': 원본 도면을 읽지 못했습니다.');
    let bytes = new Uint8Array(await response.arrayBuffer());
    const isPdf = review.fileType === 'PDF' || /\.pdf$/i.test(review.fileName) || new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
    if (isPdf) {
      let original: PDFDocument;
      try { original = await PDFDocument.load(bytes); }
      catch { throw new Error(review.fileName + ': PDF를 읽지 못했습니다. 암호·DRM 보호 또는 파일 손상 여부를 확인하세요.'); }
      const pages = await output.copyPages(original, original.getPageIndices());
      pages.forEach(page => output.addPage(page));
    } else {
      const png = bytes[0] === 137 && bytes[1] === 80;
      const jpeg = bytes[0] === 255 && bytes[1] === 216;
      if (!png && !jpeg) {
        const bitmap = await createImageBitmap(new Blob([bytes]));
        try {
          const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
          canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
          const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('이미지 변환 실패')), 'image/png'));
          bytes = new Uint8Array(await blob.arrayBuffer());
        } finally { bitmap.close(); }
      }
      const image = jpeg ? await output.embedJpg(bytes) : await output.embedPng(bytes);
      const scale = Math.min(1, 1190 / Math.max(image.width, image.height));
      const page = output.addPage([image.width * scale, image.height * scale]);
      page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    }
  }
  if (!output.getPageCount()) throw new Error('원본 도면에 출력할 페이지가 없습니다.');
  const font = await output.embedFont(StandardFonts.HelveticaBold);
  const dateParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(issuedAt);
  const date = ['year', 'month', 'day'].map(type => dateParts.find(part => part.type === type)!.value).join('.');
  for (const page of output.getPages()) {
    const box = page.getCropBox();
    const rotation = ((page.getRotation().angle % 360) + 360) % 360;
    const sideways = rotation === 90 || rotation === 270;
    const width = sideways ? box.height : box.width;
    const height = sideways ? box.width : box.height;
    // Work in the displayed page's coordinates, including rotated/cropped source PDFs.
    const transform: [number, number, number, number, number, number] = rotation === 90
      ? [0, 1, -1, 0, box.x + box.width, box.y]
      : rotation === 180 ? [-1, 0, 0, -1, box.x + box.width, box.y + box.height]
      : rotation === 270 ? [0, -1, 1, 0, box.x, box.y + box.height]
      : [1, 0, 0, 1, box.x, box.y];
    const radius = Math.min(51, Math.min(width, height) * .08);
    const margin = Math.min(18, Math.min(width, height) * .025);
    const x = width - margin - radius, y = margin + radius;
    const red = rgb(.8, .08, .1);
    page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...transform));
    page.drawCircle({ x, y, size: radius, borderColor: red, borderWidth: radius * .036, borderOpacity: .9 });
    page.drawCircle({ x, y, size: radius * .88, borderColor: red, borderWidth: radius * .014, borderOpacity: .9 });
    page.drawLine({ start: { x: x - radius * .7, y: y - radius * .035 }, end: { x: x + radius * .7, y: y - radius * .035 }, color: red, thickness: radius * .015, opacity: .9 });
    for (const line of [{ text: 'Approved', size: radius * .33, baseline: y + radius * .14 }, { text: date, size: radius * .23, baseline: y - radius * .34 }]) {
      page.drawText(line.text, { font, size: line.size, color: red, opacity: .9,
        x: x - font.widthOfTextAtSize(line.text, line.size) / 2, y: line.baseline,
    });
    }
    page.pushOperators(popGraphicsState());
  }
  output.setTitle('Approved drawings'); output.setSubject('Issued for construction');
  return output.save();
}

export async function printApprovedDrawings(reviews: ReviewItem[]) {
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('팝업을 허용한 후 다시 출도하세요.');
  popup.document.title = 'Approved 공사용 도면';
  popup.document.body.textContent = '원본 도면 우측 하단에 Approved 도장을 날인하고 있습니다…';
  try {
    const bytes = await createApprovedDrawingPdf(reviews);
    if (popup.closed) return;
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    popup.document.open();
    popup.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Approved 공사용 도면</title><style>body{margin:0;font:14px "Malgun Gothic",sans-serif;background:#edf2f7;color:#25435b}nav{display:flex;align-items:center;gap:12px;padding:12px 20px;background:white;border-bottom:1px solid #d3dfe8}nav b{margin-right:auto;color:#08744f}a,button{padding:8px 14px;border:1px solid #bdcfdd;border-radius:6px;background:white;color:#25435b;text-decoration:none;cursor:pointer}iframe{display:block;width:100%;height:calc(100vh - 65px);border:0}@media print{nav{display:none}iframe{height:100vh}}</style></head><body><nav><b>Approved · 공사용 도면</b><a id="approved-download" href="' + url + '" download="Approved_drawings.pdf">PDF 다운로드</a><button id="print">인쇄</button></nav><iframe id="approved-drawing" title="Approved 원본 도면" src="' + url + '"></iframe><script>document.getElementById("print").onclick=()=>{document.getElementById("approved-drawing").contentWindow.print();};</script></body></html>');
    popup.document.close();
    const timer = window.setInterval(() => { if (popup.closed) { URL.revokeObjectURL(url); window.clearInterval(timer); } }, 1000);
  } catch (error) { popup.close(); throw error; }
}
