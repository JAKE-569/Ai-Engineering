import type { ReviewProvider } from '../types';

// Keep originals/previews intact; only adapt the image sent to the new providers.
export async function prepareReviewImage(dataUrl: string, provider: ReviewProvider): Promise<string> {
  if (provider !== 'gpt' && provider !== 'claude') return dataUrl;
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const maxBytes = (provider === 'claude' ? 4.5 : 19) * 1024 * 1024;
  const bytes = (dataUrl.split(',')[1]?.length || 0) * 0.75;
  const maxSide = 7500;
  if (bytes <= maxBytes && Math.max(image.width, image.height) <= maxSide) return dataUrl;
  const canvas = document.createElement('canvas');
  let scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  try {
    for (let attempt = 0; attempt < 12; attempt++, scale *= 0.8) {
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('검토용 이미지 변환 실패');
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const output = canvas.toDataURL('image/jpeg', 0.9);
      if (output.length * 0.75 <= maxBytes) return output;
    }
    throw new Error('검토용 이미지 크기를 줄일 수 없습니다. 원본을 분할해 주세요.');
  } finally { canvas.width = 0; canvas.height = 0; }
}
