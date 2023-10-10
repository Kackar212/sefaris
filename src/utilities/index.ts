import { Auth, Time, Units } from '@sefaris/shared';
import { isString } from './string';

const { btoa } = window;

const ALL_UNITS = [...Object.values(Units)] as const;

type Unit = (typeof ALL_UNITS)[number];

export const TimeParser = {
  [Units.Second](value: number) {
    return value * 1000;
  },

  [Units.Minute](value: number) {
    return this.s(value) * 60;
  },

  [Units.Hour](value: number) {
    return this.min(value) * 60;
  },

  [Units.Day](value: number) {
    return this.h(value) * 24;
  },

  [Units.Month](value: number) {
    return this.d(value) * 30.436875;
  },

  [Units.Year](value: number) {
    return this.m(value) * 12;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isUnit(unit: any): unit is Unit {
    return ALL_UNITS.includes(unit);
  },

  isValidTime(value: unknown): value is Time {
    if (!isString(value)) return false;

    return new RegExp(`^[0-9]+((\\.|,)[0-9]+)?(${ALL_UNITS.join('|')})$`).test(value);
  },

  getUnit(value: Time): Unit {
    const unit = <RegExpMatchArray>value.match(new RegExp(`(${ALL_UNITS.join('|')})`));

    return unit[0] as Unit;
  },

  getTime(value: Time) {
    const time = <RegExpMatchArray>value.match(/^[0-9]+((\.|,)[0-9]+)?/);

    return Number(time[0]);
  },

  getMiliseconds(value: Time | number) {
    if (isNumber(value)) {
      return value;
    }

    if (!this.isValidTime(value)) {
      throw new Error(`Invalid TimeParser syntax: ${value}`);
    }

    const unit = this.getUnit(value);
    const time = this.getTime(value);

    return this[unit](time);
  },

  getSeconds(value: Time) {
    return this.getMiliseconds(value) / 1000;
  },

  getMinutes(value: Time) {
    return this.getSeconds(value) / 60;
  },

  getHours(value: Time) {
    return this.getMinutes(value) / 60;
  },

  getDays(value: Time) {
    return Math.trunc(this.getHours(value) / 24);
  },
};

export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

export function isUndefined(value: unknown): value is undefined {
  return typeof value === 'undefined';
}

export function isNil(value: unknown): value is null | undefined {
  return value === null || isUndefined(value);
}

export type Primitive = string | number | symbol | boolean | bigint | null | undefined;

export function isPrimitive(value: unknown): Primitive {
  if (value === null) {
    return true;
  }

  return typeof value !== 'object' && typeof value !== 'function';
}

export function isInRange(num: number, range: [number, number]) {
  const [min, max] = range;

  if (min > max) return false;

  return num >= min && num <= max;
}

export function getAuthHeader(type: Auth, value: string[]) {
  let authValue: string;

  switch (type) {
    case Auth.BASIC: {
      const [username, password] = value;

      authValue = btoa(`${username}:${password}`);

      break;
    }

    case Auth.BEARER: {
      const [token] = value;
      authValue = token;

      break;
    }
  }

  return `${type} ${authValue}`;
}

export * from './array';
export * from './object';
export * from './url';
export * from './response';
export * from './form-data';
export * from './string';
export * from './cookies';
export * from './dom';
