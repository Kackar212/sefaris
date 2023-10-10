import { DataType, FormSerializer, RequestURL, sefarisAuth, SefarisHeadersInit, Time } from '@sefaris/shared';
import { SefarisHeaders } from '@sefaris/core';
import { RequestAdapter, TransformRequestBody, Xsrf } from './types';

export interface GlobalOptions<Headers = SefarisHeadersInit | SefarisHeaders> {
  headers?: Headers;
  validateStatus?: (status: number) => boolean;
  cloneResponseBody?: boolean;
  timeout?: Time | number;
  baseURL?: RequestURL;
  defaultResult?: unknown;
  tryResolveBodyTo?: DataType | null;
  resolveResponse?: boolean;
  transformRequestBody?: TransformRequestBody | TransformRequestBody[];
  adapter?: RequestAdapter;
  auth?: sefarisAuth;
  withCredentials?: boolean;
  formSerializer?: FormSerializer;
  xsrf?: Xsrf;
}
