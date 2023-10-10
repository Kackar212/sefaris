import type { CookieValue, CookieConverter } from '.';
import { isString } from '@sefaris/utilities';

export const cookieConverter: CookieConverter = {
  decode(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },

  encode(value: CookieValue) {
    return isString(value) ? value : JSON.stringify(value);
  },
};
