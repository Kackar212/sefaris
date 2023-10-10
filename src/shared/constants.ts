import { DataType } from './data-type.enum';

export const Units = {
  Second: 's',
  Minute: 'min',
  Hour: 'h',
  Day: 'd',
  Month: 'm',
  Year: 'y',
} as const;

export const mimeTypes: Record<string, DataType> = {
  text: DataType.TEXT,
  application: DataType.ARRAY_BUFFER,
  audio: DataType.BLOB,
  font: DataType.BLOB,
  image: DataType.BLOB,
  video: DataType.BLOB,
} as const;

export const mimeSubTypes: Record<string, DataType> = {
  xml: DataType.TEXT,
  json: DataType.JSON,
  'svg+xml': DataType.TEXT,
  'mathml+xml': DataType.TEXT,
} as const;

export const DEFAULT_CONTENT_TYPE = 'application/x-www-form-urlencoded; charset=UTF-8';
export const RESPONSE_DEFAULT_CONTENT_TYPE = 'application/octet-stream';
