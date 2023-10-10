import { Auth } from './auth.enum';
import { Units } from './constants';
import { IURLResult } from './url-result.interface';

export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

export type sefarisBodyInit =
  | BodyInit
  | Record<string, unknown>
  | string
  | Node
  | TypedArray
  | DataView
  | FileList
  | null
  | [string, unknown][]
  | Iterable<[string, unknown]>;

export type sefarisAuth =
  | boolean
  | {
      type: Auth;
      value: string[];
    };

export type Time = `${number}${(typeof Units)[keyof typeof Units]}`;
export type ArrayStringIndex = { [key: string]: unknown } & Array<unknown>;
export type Visitable = Record<string | number, unknown> | unknown[] | ArrayStringIndex;
export type SefarisHeadersEntries = [string, string | string[]][];
export type SefarisHeadersInit =
  | HeadersInit
  | SefarisHeadersEntries
  | Record<string, string | string[] | Record<string, string | string[]>>;

export type HeaderFilter = RegExp | ((headerValue: string | string[], headerName: string) => boolean);
export type HeadersCollectionMethodOptions = {
  normalize?: boolean;
  raw?: boolean;
  overwrite?: boolean;
  filter?: HeaderFilter;
  method?: string;
};
export type URLParameters = Record<string, number | string | Array<number | string> | Visitable>;
export type Query = string | [string, string][] | Record<string, unknown> | URLSearchParams | URL;
export type RequestURL = string | IURLResult | URL;
export type sefarisURLOptions = { query?: Query; parameters?: URLParameters; baseURL?: RequestURL };
type MetaToken = {
  token: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handle: (value: any) => string | Blob;
  stripToken?: boolean;
};
export type FormSerializer = {
  visitor: (
    this: FormSerializer,
    item: unknown,
    key: string,
    path: string[],
    formData: FormData | URLSearchParams
  ) => boolean | Iterable<unknown>;
  dots: boolean;
  indexes: boolean | null;
  metaTokens: MetaToken[];
  stripToken: boolean;
};
