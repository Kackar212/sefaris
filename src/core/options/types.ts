import { sefarisBodyInit } from '@sefaris/shared';
import { EasyRequest } from '../easy-request';
import { SefarisHeaders } from '../headers';
import { sefarisOptions } from './sefaris-options.interface';
import { EasyResponse } from '../easy-response';
import { GlobalOptions } from './global-options.interface';

export type Options<T> = sefarisOptions<T, SefarisHeaders> & Required<GlobalOptions<SefarisHeaders>>;
export type Url<T> = NonNullable<Options<T>['url']>;

export type TransformRequestBody = (
  body: sefarisBodyInit | undefined,
  headers: SefarisHeaders
) => sefarisBodyInit | undefined;
export type RequestAdapter = <T>(easyRequest: EasyRequest<T>) => Promise<EasyResponse<T>>;
export type Xsrf = {
  cookie: string;
  header: string;
};
