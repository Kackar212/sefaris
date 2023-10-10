import { URLResult, isNumber } from '.';
import { TypedArray, ArrayStringIndex, Visitable, RequestURL } from '@sefaris/shared';
import { hasEntries, isArray, isEmpty } from './array';
import { isNumeric, isString } from './string';

export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function isObject<T>(value: unknown): value is T & Object & { [key: PropertyKey]: unknown } {
  return typeof value === 'object' && value !== null;
}

export function isRequestUrl(value: unknown): value is RequestURL {
  return kindOf(URL, value) || kindOf(URLResult, value) || isString(value);
}

export function isPlainObject<T extends Record<PropertyKey, unknown>>(
  object: unknown
): object is T extends Record<infer K, infer V> ? Record<K, V> : never {
  return toString.call(object) === '[object Object]' && Object.getPrototypeOf(object) === Object.prototype;
}

export function isIterable<T>(value: unknown): value is Iterable<T> {
  if (!isObject(value)) return false;

  const iterator = value[Symbol.iterator];
  return typeof iterator === 'function' && typeof value !== 'string';
}

export function getKeysFromPath(path: string): string[] {
  return path
    .replace(/(\[(.+?)\])/g, (_, bracketsWithIndex, index) => {
      return bracketsWithIndex === '[]' ? '[]' : `.${index.replace(/\./g, '%2E')}`;
    })
    .split('.')
    .filter((key) => key !== '')
    .map((key) => key.replace(/%2E/g, '.'));
}

function getKey(key: string | `${number}`) {
  return isNumeric(key) ? parseInt(key) : key;
}

export function isVisitable(obj: unknown): obj is Visitable {
  return Array.isArray(obj) || isPlainObject(obj);
}

export function getFromPath<T>(object: Visitable, path: string): T | undefined {
  if (!path) return object as T;

  const keys = getKeysFromPath(path);

  let curr: unknown = object;

  for (const key of keys) {
    let index = getKey(key);
    if (isNumber(index) && index < 0 && isArray(curr)) {
      index = curr.length + index;
    }

    if (isIterable(curr)) curr = Array.from(curr);
    if (!isVisitable(curr)) {
      throw new Error('First argument is not visitable');
    }

    if (isArray(curr)) {
      if (!isNumber(index)) {
        throw new Error(`Incorrect path: ${path}`);
      }

      curr = curr[index];
      continue;
    }

    curr = curr[key];
  }

  return curr as T;
}

type Iterator = {
  result: Record<string, unknown>;
  currentObject: Record<string | number, unknown> | ArrayStringIndex;
  index: number;
  key: string;
  keys: string[];
  keysLastIndex: () => number;
  value: unknown;
  next: () => string;
  done: () => boolean;
};

const hasBrackets = (key: string, type = '[]') => key.endsWith(type);

type SetValueOptions = {
  hasCurlyBrackets: boolean;
  hasSquareBrackets: boolean;
  iterator: Iterator;
};

export function hasProperty(target: object, key: PropertyKey) {
  return Reflect.has(target, key);
}

function setValue(key: string | number, value: unknown, options: SetValueOptions) {
  const {
    hasCurlyBrackets,
    hasSquareBrackets,
    iterator: { currentObject },
  } = options;

  if (hasCurlyBrackets) {
    try {
      value = JSON.parse(value as string);
      // eslint-disable-next-line no-empty
    } catch {}

    currentObject[key] = value;

    return;
  }

  if (hasSquareBrackets) {
    const current = currentObject[key];
    if (isArray<unknown>(current)) {
      current.push(value);

      return;
    }

    currentObject[key] = [value];
    return;
  }

  if (isArray(currentObject) && !isNumeric(key)) {
    currentObject.push({ [key]: value });

    return;
  }

  currentObject[key] = value;
}

function createIterator(partialIterator: Partial<Iterator>): Iterator {
  return {
    currentObject: {},
    index: 0,
    key: '',
    keys: [],
    value: undefined,
    result: {},
    ...partialIterator,
    keysLastIndex() {
      return this.keys.length > 0 ? this.keys.length - 1 : 0;
    },
    next() {
      this.key = this.keys[++this.index];

      return this.key;
    },
    done() {
      return this.index >= this.keysLastIndex();
    },
  };
}

function toObject(iterator: Iterator): Record<string, unknown> {
  iterator.result = iterator.currentObject;
  iterator.key = iterator.keys[0];

  for (;;) {
    const { currentObject, value } = iterator;
    let { key } = iterator;

    const hasSquareBrackets = hasBrackets(key);
    const hasCurlyBrackets = hasBrackets(key, '{}');

    if (hasSquareBrackets || hasCurlyBrackets) {
      key = key.substring(0, key.length - 2);
    }

    if (iterator.done()) {
      setValue(getKey(key), value, { hasCurlyBrackets, hasSquareBrackets, iterator });
      break;
    }

    const nextKey = iterator.next();

    const convertedKey = getKey(key);
    if (!currentObject[convertedKey]) {
      currentObject[convertedKey] = {};

      if (hasSquareBrackets || isNumeric(nextKey)) {
        currentObject[convertedKey] = [];
      }
    }

    const curr = currentObject[convertedKey];
    if (isObject(curr)) {
      iterator.currentObject = curr;

      continue;
    }

    throw new Error(`Incorrect path ${iterator.keys.join('.')}`);
  }

  return iterator.result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createFromEntries<T extends Record<string | number, any>>(
  entries: Iterable<[string, unknown]>,
  obj: T = <T>{}
) {
  const entriesAsArray = Array.from<[string, unknown]>(entries);

  if (isEmpty(entriesAsArray) || !hasEntries(entriesAsArray)) {
    return {};
  }

  for (const [path, value] of entriesAsArray) {
    if (!isString(path)) {
      return obj;
    }

    const keys = getKeysFromPath(path);

    const iterator = createIterator({
      keys,
      currentObject: obj,
      value,
    });

    toObject(iterator);
  }

  return obj;
}

export const kindOf =
  /* eslint-disable-next-line @typescript-eslint/ban-types */
  <T extends Function>(kind: T, value: unknown): boolean => {
    return toString.call(value) === `[object ${kind.name}]` || value instanceof kind;
  };

export function isFileList(fileList: unknown): fileList is FileList {
  return kindOf(FileList, fileList);
}

export function isFile(file: unknown): file is File {
  return kindOf(File, file);
}

export function isURLSearchParams(urlSearchParams: unknown): urlSearchParams is URLSearchParams {
  return kindOf(URLSearchParams, urlSearchParams);
}

export const isBlob = (v: unknown): v is Blob => kindOf(Blob, v);

export const isArrayBuffer = (v: unknown): v is ArrayBuffer => kindOf(ArrayBuffer, v);
export const isArrayBufferView = (bufferView: unknown): bufferView is ArrayBufferView => ArrayBuffer.isView(bufferView);
export const isStream = (v: unknown): v is ReadableStream => kindOf(window.ReadableStream, v);
export const isHeaders = (headers: unknown): headers is Headers => kindOf(Headers, headers);
export const isDate = (v: unknown): v is Date => kindOf(Date, v);
export const isURL = (v: unknown): v is URL => kindOf(URL, v);
export const isTypedArray = (v: unknown): v is TypedArray =>
  [
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
  ].some((typedArrayClass) => kindOf(typedArrayClass, v));
