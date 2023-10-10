import { Options, Url } from './types';

export interface RequestOptions<T> extends Options<T> {
  url: Url<T>;
}
