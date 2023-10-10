import { HeaderFilter, HeadersCollectionMethodOptions, SefarisHeadersInit } from '@sefaris/shared';
import { getFromPath, getKeysFromPath, isArray, isPlainObject, normalizeHeader } from '@sefaris/utilities';

const defaultOptions: HeadersCollectionMethodOptions = {
  normalize: false,
  raw: false,
  overwrite: false,
  filter: undefined,
};
type Predicate<ReturnType = void> = (
  item: string | string[],
  key: string,
  arr: [string, string | string[] | Record<string, string | string[]>][]
) => ReturnType;

function isHeaderFilter(filter: unknown): filter is HeaderFilter {
  return typeof filter === 'function' || filter instanceof RegExp;
}

export class HeadersCollection implements Iterable<Array<string | string[]>> {
  #headers: Record<string, string> = {};
  #rawHeaders: Record<string, string | string[]> = {};
  #canNormalize = false;
  methodHeaders: Record<string, Record<string, string | string[]>> = {
    post: {},
    get: {},
    put: {},
    patch: {},
    delete: {},
  };
  readonly headers: Record<string, string>;

  constructor(headers: SefarisHeadersInit = {}) {
    [this.#rawHeaders, this.#headers] = this.#init(headers);
    this.headers = { ...this.#headers };
  }

  #getMethodHeader(method: string): Record<string, string | string[]>;
  #getMethodHeader(method: string, headerName: string): string | string[];
  #getMethodHeader(method: string, headerName?: string): Record<string, string | string[]> | string | string[] {
    method = method.toLowerCase();

    if (headerName && this.methodHeaders[method]) {
      return this.methodHeaders[method][headerName];
    }

    return this.methodHeaders[method];
  }

  #init(headers: SefarisHeadersInit): [Record<string, string | string[]>, Record<string, string>] {
    const newHeaders = new Headers(headers as HeadersInit);
    const result: {
      raw: { [key: string]: string | string[] };
      headers: { [key: string]: string };
    } = {
      raw: {},
      headers: {},
    };

    for (const [header, value] of newHeaders) {
      result.headers[header] = value;
      result.raw[header] = value;
    }

    return [result.raw, result.headers];
  }

  #setHeader(headerName: string, headerValue: string | string[]) {
    if (Array.isArray(headerValue)) {
      headerValue = headerValue.join(', ');
    }

    this.#headers[headerName] = headerValue;
    this.headers[headerName] = headerValue;
  }

  #setRawHeader(headerName: string, headerValue: string | string[], overwrite: boolean): string | string[] {
    if (!this.#rawHeaders[headerName] || overwrite) {
      this.#rawHeaders[headerName] = headerValue;

      return headerValue;
    }

    const rawHeaderValue = this.#rawHeaders[headerName];

    if (Array.isArray(rawHeaderValue)) {
      return (this.#rawHeaders[headerName] = rawHeaderValue.concat(headerValue));
    }

    return (this.#rawHeaders[headerName] = [rawHeaderValue].concat(headerValue));
  }

  #isMatch(filter: HeaderFilter, headerName: string, headerValue: string | string[]) {
    switch (typeof filter) {
      case 'function': {
        return filter(headerValue, headerName);
      }

      case 'object': {
        if (filter instanceof RegExp) {
          if (Array.isArray(headerValue)) {
            return filter.test(headerValue.join(', '));
          }

          return filter.test(headerValue as string);
        }

        return false;
      }
    }
  }

  #normalizeHeaderName(headerName: string, canNormalize = false) {
    if (this.#canNormalize || canNormalize) {
      headerName = normalizeHeader(headerName);
    }

    return headerName.toLowerCase();
  }

  #getNormalizedHeader(
    headerName: string,
    options: HeadersCollectionMethodOptions
  ): [string, string | string[]] | undefined {
    const { raw, normalize, method } = options;

    try {
      const [methodName, header] = getKeysFromPath(headerName);

      if (!this.methodHeaders[methodName]) throw '';

      const headers = getFromPath<string | string[]>(this.methodHeaders, headerName);
      if (typeof headers !== 'string') {
        return undefined;
      }

      return [header, headers];
      // eslint-disable-next-line no-empty
    } catch {}

    const normalizedName = this.#normalizeHeaderName(headerName, normalize);
    let headerValue = method && this.#getMethodHeader(method, normalizedName);

    if (headerValue) {
      return [normalizedName, headerValue];
    }

    headerValue = raw ? this.#rawHeaders[normalizedName] : this.#headers[normalizedName];

    if (!headerValue) {
      return;
    }

    return [normalizedName, headerValue];
  }

  #getOptions(
    optionsOrFilter: HeaderFilter | HeadersCollectionMethodOptions = defaultOptions
  ): HeadersCollectionMethodOptions {
    return this.isOptions(optionsOrFilter) ? optionsOrFilter : {};
  }

  #getFilter(optionsOrFilter: HeaderFilter | HeadersCollectionMethodOptions = defaultOptions): HeaderFilter | undefined {
    if (this.isOptions(optionsOrFilter)) {
      return optionsOrFilter.filter;
    }

    return optionsOrFilter;
  }

  normalize(canNormalize = true) {
    this.#canNormalize = canNormalize;
  }

  isOptions(options: unknown): options is HeadersCollectionMethodOptions {
    return typeof options === 'object' && !isHeaderFilter(options);
  }

  get<T extends string | string[] = string>(
    headerName: string,
    filterOrOptions: HeaderFilter | HeadersCollectionMethodOptions = defaultOptions
  ): T | undefined {
    const filter: HeaderFilter | undefined = this.#getFilter(filterOrOptions);
    const options = this.#getOptions(filterOrOptions);

    const normalizedHeader = this.#getNormalizedHeader(headerName, options);
    if (!normalizedHeader) return;

    const [normalizedName, headerValue] = normalizedHeader;

    if (filter && !this.#isMatch(filter, normalizedName, headerValue)) return;

    if (!options.raw && isArray(headerValue)) {
      return headerValue.join(',') as T;
    }

    return headerValue as T;
  }

  has(headerName: string, filterOrOptions: HeaderFilter | HeadersCollectionMethodOptions = defaultOptions): boolean {
    const filter: HeaderFilter | undefined = this.#getFilter(filterOrOptions);

    const normalizedHeader = this.#getNormalizedHeader(headerName, this.#getOptions(filterOrOptions));
    if (!normalizedHeader) return false;

    if (!filter) return true;

    const [normalizedName, headerValue] = normalizedHeader;
    return this.#isMatch(filter, normalizedName, headerValue);
  }

  add(headerName: string, headerValue: string | string[], options: HeadersCollectionMethodOptions = defaultOptions): void {
    const { normalize, overwrite } = options;
    const [httpMethod, header] = headerName.split('.');
    const { methodHeaders } = this;
    let { method = httpMethod } = options;

    method = method.toLowerCase();

    if (methodHeaders[method] && header) {
      headerName = header;
    }

    headerName = this.#normalizeHeaderName(headerName, normalize);

    if (method && method !== headerName) {
      const normalizedMethod = method.toLowerCase();

      if (!methodHeaders[normalizedMethod]) {
        return;
      }

      methodHeaders[normalizedMethod][headerName] = headerValue;

      return;
    }

    this.#setHeader(headerName, this.#setRawHeader(headerName, headerValue, !!overwrite));
  }

  delete(headerName: string, optionsOrFilter: HeaderFilter | HeadersCollectionMethodOptions = defaultOptions): boolean {
    if (!this.has(headerName, optionsOrFilter)) return false;
    const options = this.#getOptions(optionsOrFilter);

    const normalizedHeader = this.#getNormalizedHeader(headerName, options);
    if (!normalizedHeader) return false;

    const [normalizedName, headerValue] = normalizedHeader;

    const filter = this.#getFilter(optionsOrFilter);
    if (filter && !this.#isMatch(filter, normalizedName, headerValue)) return false;

    if (options.method) {
      return delete this.methodHeaders[options.method.toLowerCase()][normalizedName];
    }

    const isDeleted = delete this.#rawHeaders[normalizedName] && delete this.#headers[normalizedName];

    return isDeleted;
  }

  entries({ raw, method }: HeadersCollectionMethodOptions = {}) {
    const methodHeaders = method ? (this.#getMethodHeader(method) as Record<string, string | string[]>) : {};
    const headers = raw ? this.#rawHeaders : this.#headers;

    return Object.entries({ ...methodHeaders, ...headers }).values();
  }

  keys({ raw, method }: HeadersCollectionMethodOptions = {}): IterableIterator<string> {
    const methodHeaders = method ? (this.#getMethodHeader(method) as Record<string, string | string[]>) : {};
    const headers = raw ? this.#rawHeaders : this.#headers;

    return Object.keys({ ...methodHeaders, ...headers }).values();
  }

  values({ raw, method }: HeadersCollectionMethodOptions = {}): IterableIterator<string | string[]> {
    const methodHeaders = method ? (this.#getMethodHeader(method) as Record<string, string | string[]>) : {};
    const headers = raw ? this.#rawHeaders : this.#headers;

    return Object.values({ ...methodHeaders, ...headers }).values();
  }

  [Symbol.iterator]() {
    return this.entries();
  }

  all(options?: HeadersCollectionMethodOptions): Record<string, string | string[]>;
  all(filter?: HeaderFilter): Record<string, string | string[]>;
  all(optionsOrFilter: HeaderFilter | HeadersCollectionMethodOptions = {}) {
    const filterHeaders = (filter: HeaderFilter, raw = false) => {
      return this.filter(
        (value: string | string[] | Record<string, string | string[]>, header: string) => {
          if (isPlainObject(value)) return false;

          return this.#isMatch(filter, header, value);
        },
        undefined,
        { raw }
      );
    };

    const filter = this.#getFilter(optionsOrFilter);
    const { raw, method } = this.#getOptions(optionsOrFilter);

    let headers = raw ? this.#rawHeaders : this.#headers;

    if (method) {
      return { ...headers, ...this.methodHeaders[method.toLowerCase()] };
    }

    if (filter) {
      headers = filterHeaders(filter, raw);
    }

    return headers;
  }

  filter(callback: Predicate<boolean>, thisArg: unknown = this, options: HeadersCollectionMethodOptions = {}) {
    const headersAsEntries = Array.from(this.entries(options));
    const result: {
      [key: string]: string | string[];
    } = {};

    for (const [key, value] of this) {
      if (callback.call(thisArg, value, key, headersAsEntries)) {
        result[key] = value;
      }
    }

    return result;
  }

  forEach(callback: Predicate, thisArg: unknown = this, options: HeadersCollectionMethodOptions = {}) {
    const headersAsEntries = Array.from(this.entries(options));

    for (const [key, value] of this) {
      callback.call(thisArg, value, key, headersAsEntries);
    }
  }

  find(callback: Predicate<boolean>, thisArg: unknown = this, options: HeadersCollectionMethodOptions = {}) {
    const headersAsEntries = Array.from(this.entries(options));

    for (const [key, value] of this) {
      if (callback.call(thisArg, value, key, headersAsEntries)) {
        return [key, value];
      }
    }

    return;
  }

  toString() {
    return JSON.stringify(this.#rawHeaders);
  }

  toJSON(options: HeadersCollectionMethodOptions = {}) {
    return JSON.stringify(this.all(options));
  }
}
