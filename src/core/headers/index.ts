import { isUndefined, isArray, isHeaders, isPlainObject, isString } from '@sefaris/utilities';
import { HeadersCollection } from './header-collection';
import { SefarisHeadersInit } from '@sefaris/shared';

export class SefarisHeaders extends HeadersCollection {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: PropertyKey]: any;
  #proxy: SefarisHeaders;

  constructor(headers: SefarisHeadersInit | SefarisHeaders = {}) {
    super({});

    this.#proxy = this.#createProxy();

    this.set(headers);

    return this.#proxy;
  }

  #createProxy() {
    return new Proxy(this, {
      get: (target: SefarisHeaders, key: PropertyKey, receiver) => {
        if (key === 'length') {
          return Object.values(this.headers).length;
        }

        if (typeof target[key] !== 'undefined' || !isString(key)) {
          const propertyOrMethod = Reflect.get(target, key, receiver);
          if (typeof propertyOrMethod === 'function') {
            return propertyOrMethod.bind(target);
          }

          return propertyOrMethod;
        }

        return target.get.bind(target)(key);
      },
    });
  }

  #flat(headers: SefarisHeadersInit, result: Record<string, string | string[]> = {}) {
    const entries = isArray(headers) ? headers : Object.entries(headers);

    for (const [key, value] of entries) {
      if (isPlainObject(value) || isArray(value)) {
        result[key] = JSON.stringify(value);
        continue;
      }

      result[key] = value;
    }

    return result;
  }

  #unflat(
    headers: IterableIterator<[string, string]>,
    result: Record<string, string | Record<string, string | string[]>> = {}
  ): [string, string | Record<string, string | string[]> | string[]][] {
    for (const [key, value] of headers) {
      try {
        result[key] = JSON.parse(value);
        continue;
      } catch (e) {
        result[key] = value;
      }
    }

    return Object.entries(result);
  }

  #insert(
    headers: string | SefarisHeadersInit | SefarisHeaders,
    value?: string | string[] | undefined,
    overwrite?: boolean
  ): void {
    let newHeaders = headers;

    if (typeof newHeaders === 'string') {
      if (typeof value !== 'undefined') {
        this.add(newHeaders, value, { overwrite });
      }

      return;
    }

    if (newHeaders instanceof SefarisHeaders) {
      return this.#insert(newHeaders.all({ raw: true }), undefined, true);
    }

    newHeaders = isHeaders(newHeaders) ? newHeaders : this.#flat(newHeaders);

    const normalizedHeaders = new Headers(newHeaders as HeadersInit);

    const unflatedEntries = this.#unflat(normalizedHeaders.entries());
    for (const [headerName, headerValue] of unflatedEntries) {
      if (isPlainObject<Record<string, string | string[]>>(headerValue)) {
        for (const header in headerValue) {
          this.add(header, headerValue[header], { method: headerName.toLowerCase(), overwrite });
        }

        continue;
      }

      this.add(headerName, headerValue, { overwrite });
    }
  }

  clone() {
    return new SefarisHeaders(this);
  }

  native() {
    return new Headers(this.all({ raw: true }) as HeadersInit);
  }

  create(headers: SefarisHeadersInit | SefarisHeaders | string = {}) {
    return SefarisHeaders.from(headers);
  }

  append(headers: SefarisHeadersInit | SefarisHeaders): SefarisHeaders;
  append(name: string, value: string | string[]): SefarisHeaders;
  append(headers: SefarisHeadersInit | SefarisHeaders | string, value?: string | string[]): SefarisHeaders {
    this.#insert(headers, value, false);

    return this.#proxy;
  }

  set(headers?: SefarisHeadersInit | SefarisHeaders): SefarisHeaders;
  set(name: string, value: string | string[]): SefarisHeaders;
  set(headers: SefarisHeadersInit | SefarisHeaders | string | undefined, value?: string | string[]): SefarisHeaders {
    if (isUndefined(headers)) {
      return this.#proxy;
    }

    this.#insert(headers, value, true);

    return this.#proxy;
  }

  static from(headers?: SefarisHeadersInit | string | SefarisHeaders) {
    const sefarisHeaders = new SefarisHeaders();

    if (isString(headers)) {
      headers = headers
        .trim()
        .split(/[\r\n]+/)
        .map((header) => {
          const [name, ...parts] = header.split(':');

          return [name.trim(), parts.join(':').trim()];
        }) as [string, string][];
    }

    sefarisHeaders.set(headers);

    return sefarisHeaders;
  }
}
