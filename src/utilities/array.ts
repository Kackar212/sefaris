import { isPrimitive, Primitive } from '.';

export function isArray<T>(value: unknown): value is Array<T> {
  return Array.isArray(value);
}

export function isEmpty<T>(arr: unknown): boolean {
  return isArray<T>(arr) && arr.length === 0;
}

export function isArrayFlat<T extends Primitive>(arr: unknown[]): arr is Array<T> {
  return !arr.some((value) => !isPrimitive(value));
}

export function hasEntries<T>(arr: unknown[]): arr is Array<T> {
  if (!isArray(arr)) {
    return false;
  }

  return !arr.some((value) => isPrimitive(value));
}
