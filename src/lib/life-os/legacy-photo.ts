const TARGET_BYTES = 120 * 1024;
export function isLegacyRaster(value: string): boolean {
  return /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}
export function imageBytes(value: string): number {
  const payload = value.slice(value.indexOf(',') + 1);
  return Math.max(
    0,
    Math.ceil((payload.length * 3) / 4) -
      (payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0),
  );
}

/** Decode local data URLs only. No remote fetch or original-storage mutation. */
export async function prepareLegacyPhoto(source: string): Promise<string> {
  if (!isLegacyRaster(source)) throw new Error('JPEG·PNG·WebP 이외의 사진 형식');
  if (imageBytes(source) <= TARGET_BYTES) return source;
  if (source.length > 15 * 1024 * 1024) throw new Error('원본 사진이 15MB 제한을 초과함');
  if (typeof Image === 'undefined' || typeof document === 'undefined')
    throw new Error('브라우저에서 사진 변환이 필요함');
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('사진을 해석할 수 없음'));
    image.src = source;
  });
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('사진 크기를 확인할 수 없음');
  const canvas = document.createElement('canvas');
  try {
    let maximum = 1400;
    for (let attempt = 0; attempt < 6; attempt++) {
      const ratio = Math.min(1, maximum / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('사진 변환 기능을 사용할 수 없음');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.66, 0.5, 0.36]) {
        const compressed = canvas.toDataURL('image/jpeg', quality);
        if (isLegacyRaster(compressed) && imageBytes(compressed) <= TARGET_BYTES) return compressed;
      }
      maximum = Math.round(maximum * 0.68);
    }
    throw new Error('120KB 이하로 사진을 압축하지 못함');
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    image.src = '';
  }
}
