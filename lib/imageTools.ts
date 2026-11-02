// Phones take photos of 3 to 8 MB. Mobile data is slow and costly, and the API accepts 3 MB at most,
// so each photo is resized on the device before it is sent. Re-drawing the picture also drops the
// hidden camera data (EXIF), which can include the owner's home position.

const MAX_SIDE = 1600;
const QUALITY = 0.8;

export interface PreparedPhoto {
  dataUrl: string;
  bytes: number;
  width: number;
  height: number;
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) {
    throw new Error('Choose a photo (JPEG, PNG or WebP).');
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('This photo could not be read. If it is a HEIC photo, change the camera setting to "Most compatible" and try again.');

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot prepare photos.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob) throw new Error('This photo could not be prepared.');
  if (blob.size > 2_800_000) throw new Error('This photo is still too large after shrinking it. Try a smaller one.');

  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('This photo could not be read.'));
    reader.readAsDataURL(blob);
  });
  return { dataUrl, bytes: blob.size, width, height };
}
