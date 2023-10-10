import { Query, RequestURL, URLParameters } from './types';

export interface IURLResult {
  readonly url: string;
  readonly query: Query;
  readonly parameters: URLParameters;
  readonly baseURL: RequestURL;

  toString(): string;
  valueOf(): string;
  encode(): string;
  decode(): string;
}
