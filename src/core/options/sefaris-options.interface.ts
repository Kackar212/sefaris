import { DataType, URLParameters, Query, sefarisBodyInit, SefarisHeadersInit, RequestURL } from '@sefaris/shared';
import { GlobalOptions, SefarisHeaders } from '@sefaris/core';
import { XhrOptions } from './xhr-options.interface';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface sefarisOptions<DataSchema = any, Headers = SefarisHeadersInit | SefarisHeaders>
  extends Omit<RequestInit, 'body' | 'headers' | 'signal'>,
    XhrOptions<DataSchema>,
    GlobalOptions<Headers> {
  body?: sefarisBodyInit;
  transformResult?: (easyResult: DataSchema) => unknown;
  parameters?: URLParameters;
  query?: Query;
  responseBodyType?: DataType;
  abortController?: AbortController;
  mimeType?: string;
  url?: RequestURL;
  method?: string;
}
