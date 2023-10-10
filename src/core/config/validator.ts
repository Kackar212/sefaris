/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  isNumber,
  isArray,
  hasEntries,
  isArrayBufferView,
  isIterable,
  isObject,
  isPlainObject,
  isTypedArray,
  isVisitable,
  kindOf,
  isString,
  isValidURL,
  isUndefined,
  URLResult,
} from '@sefaris/utilities';
import { SefarisError, SefarisHeaders } from '@sefaris/core';

type Condition = (...args: any[]) => boolean;
type StrictCondition = Condition & { strict?: boolean };

class ConfigValidator {
  [key: string]: unknown;
  #conditions: StrictCondition[] = [];

  constructor(validator?: ConfigValidator) {
    if (validator) {
      this.#conditions = [...validator.#conditions];
    }
  }

  #clone() {
    return new ConfigValidator(this);
  }

  #add(cb: (next: ConfigValidator) => void) {
    const next = this.#clone();

    cb(next);

    return next;
  }

  #strictUnshift(conditions: StrictCondition[]) {
    conditions.forEach((condition) => {
      condition.strict = true;
    });

    return this.#add((next) => {
      next.#conditions.unshift(...conditions);
    });
  }

  #push(conditions: Condition[]) {
    return this.#add((next) => {
      next.#conditions.push(...conditions);
    });
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  isInstanceOf(instances: Function[]) {
    return this.#push([(value: unknown) => instances.every((instance) => kindOf(instance, value))]);
  }

  isType(types: string[]) {
    return this.#push([(value: unknown) => types.some((type) => typeof value === type)]);
  }

  is(values: unknown[]) {
    return this.#push([(value: unknown) => values.some((v) => v === value)]);
  }

  custom(conditions: Condition[]) {
    return this.#push([(value: unknown) => conditions.some((condition) => condition(value))]);
  }

  required() {
    return this.#strictUnshift([(value) => value != null]);
  }

  #checkObject(obj: unknown, values: Array<(...args: any[]) => boolean>, parent: unknown): boolean {
    if (!isObject(obj)) {
      return false;
    }

    const entries = Object.entries(obj);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_, value] of entries) {
      if (isVisitable(value)) {
        return this.#checkObject(value, values, parent);
      }

      if (values.every((v: (...args: any[]) => boolean) => v(value))) {
        return false;
      }
    }

    return true;
  }

  object(values: Array<(...args: any[]) => boolean> | Record<PropertyKey, (...args: unknown[]) => boolean>) {
    if (isArray(values)) {
      return this.#push([
        (value: unknown) => {
          return this.#checkObject(value, values, value);
        },
      ]);
    }

    return this.#push([
      (value: unknown, key: string) => {
        return values[key](value);
      },
    ]);
  }

  isOneOf(values: unknown[]) {
    return this.#push([(value) => values.some((v) => v === value)]);
  }

  validate(
    schema: Record<string, ConfigValidator | Record<string, ConfigValidator>>,
    value?: any,
    path: string[] = [],
    parent?: Record<string, unknown>
  ): boolean {
    const schemaEntries = Object.entries(schema);

    if (!isPlainObject(value)) {
      throw new SefarisError('Config is not an object!', SefarisError.BAD_CONFIG);
    }

    main: for (const entry of schemaEntries) {
      const [key, validator] = entry;

      if (isPlainObject<Record<string, ConfigValidator>>(validator)) {
        const nestedValue = value[key];

        if (!isPlainObject(nestedValue)) continue;

        if (this.validate(validator, nestedValue, path.concat(key), parent || value)) {
          continue;
        }

        return false;
      }

      for (const condition of validator.#conditions) {
        if (isUndefined(value[key]) && !condition.strict) continue main;

        if (condition(value[key], key)) {
          continue main;
        }

        if (condition.strict) {
          throw new SefarisError(`Option ${key} is incorrect`, SefarisError.BAD_CONFIG, {
            config: parent || value,
            cause: path.concat(key).join('.'),
          });
        }
      }

      throw new SefarisError(`Option ${key} is incorrect`, SefarisError.BAD_CONFIG, {
        config: parent || value,
        cause: path.concat(key).join('.'),
      });
    }

    return true;
  }

  get() {
    return this.#conditions;
  }

  static create() {
    return new ConfigValidator();
  }
}

const validator = new ConfigValidator();

const optionsSchema = {
  body: validator
    .isInstanceOf([Node, FormData, ReadableStream, DataView, FileList, URLSearchParams, ArrayBuffer])
    .isType(['string'])
    .is([null])
    .custom([isArrayBufferView, isObject, isTypedArray, isIterable, hasEntries]),
  headers: validator.custom([hasEntries, isIterable, isObject]).isInstanceOf([SefarisHeaders, Headers]).isType(['string']),
  validateStatus: validator.isType(['function']),
  transformResponse: validator.isType(['function']),
  parameters: validator.isType(['string']).object([isVisitable, isString, isNumber]),
  query: validator.isType(['string']).custom([isObject, isArray]).isInstanceOf([URLSearchParams]),
  responseBodyType: validator.isOneOf(['json', 'text', 'arrayBuffer', 'blob']),
  cloneResponseBody: validator.isType(['boolean']),
  tryResolveBodyTo: validator.isOneOf(['json', 'text', 'arrayBuffer', 'blob', null]),
  timeout: validator.isType(['string', 'number']),
  abortController: validator.isInstanceOf([AbortController]),
  baseURL: validator.isType(['string']).isInstanceOf([URLResult]).custom([isValidURL]),
  canDownloadFile: validator.isType(['boolean']),
  mimeType: validator.isType(['string']),
  url: validator.isType(['string']).isInstanceOf([URLResult]),
  transformRequestBody: validator.isType(['function']),
  filename: validator.isType(['string']),
  resolveResponse: validator.isType(['boolean']),
  xsrf: {
    cookie: validator.isType(['string']),
    header: validator.isType(['string']),
  },
};

const requestOptionsSchema = {
  ...optionsSchema,
  url: optionsSchema.url.required(),
  headers: validator.isInstanceOf([SefarisHeaders]).required(),
};

const xhrOptionsSchema = {
  ...optionsSchema,
  onLoadStart: validator.isType(['function']),
  onLoad: validator.isType(['function']),
  onLoadEnd: validator.isType(['function']),
  onProgress: validator.isType(['function']),
  onDownloadProgress: validator.isType(['function']),
  state: {
    opened: validator.isType(['function']),
    loading: validator.isType(['function']),
    headersReceived: validator.isType(['function']),
    done: validator.isType(['function']),
    unsent: validator.isType(['function']),
  },
  upload: {
    onLoadStart: validator.isType(['function']),
    onLoad: validator.isType(['function']),
    onLoadEnd: validator.isType(['function']),
  },
};

export { xhrOptionsSchema, requestOptionsSchema, validator, optionsSchema };
