import { URLParameters, Query, RequestURL, sefarisURLOptions, IURLResult } from '@sefaris/shared';

export class URLResult extends URL implements IURLResult {
  readonly url: string;
  readonly query: Query;
  readonly parameters: URLParameters;
  readonly baseURL: RequestURL;

  constructor(url: string | URL, options: sefarisURLOptions = {}) {
    super(url, options.baseURL?.toString());
    this.url = url.toString();
    this.query = options.query || {};
    this.parameters = options.parameters || {};
    this.baseURL = options.baseURL?.toString() || location.origin;

    return Object.freeze(this);
  }

  toString() {
    return this.url;
  }

  valueOf(): string {
    return this.url;
  }

  encode() {
    return encode(this.url);
  }

  decode() {
    return decode(this.url);
  }
}

export function encode(url: string | URLResult) {
  return encodeURI(url.toString());
}

export function decode(url: string | URL | URLResult) {
  return decodeURI(url.toString());
}
