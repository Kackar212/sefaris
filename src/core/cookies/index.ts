import { Time } from '@sefaris/shared';

export type CookieValue = string | Record<string, unknown> | Array<unknown> | number;
export type CookieOptions = {
  path?: string;
  domain?: string;
  expires?: string | Date | number | Time;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
};
export type CookieData = {
  name: string;
  value: CookieValue;
  options?: CookieOptions;
};
export interface CookieConverter {
  decode(value: string, name: string): CookieValue;
  encode(value: CookieValue, name: string): string;
}

export * from './cookies';
