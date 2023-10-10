import { DataType, mimeTypes as defaultMimeTypes, mimeSubTypes } from '@sefaris/shared';

export function getResponseBodyType(mimeType: string, mimeTypes: Record<string, DataType> = {}): DataType {
  mimeTypes = { ...defaultMimeTypes, ...mimeSubTypes, ...mimeTypes };

  const [type, subtype] = mimeType.split('/') as [keyof typeof mimeTypes, keyof typeof mimeTypes];

  return mimeTypes[subtype] || mimeTypes[type];
}

export function getMimeType(contentType: string): string | undefined {
  return contentType.split(';')[0];
}
