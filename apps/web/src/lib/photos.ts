/** The size a photo is scaled to so its longest side is at most `max` pixels. Never enlarges. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export const PHOTO_MAX_SIDE = 1280;
export const PHOTO_QUALITY = 0.7;

/** Shrinks a camera photo to a JPEG data URL before it is stored on the device. Browser only. */
export async function compressPhoto(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = fitWithin(bitmap.width, bitmap.height, PHOTO_MAX_SIDE);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
}
