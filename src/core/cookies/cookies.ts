import type { CookieData, CookieOptions, CookieValue, CookieConverter } from '.';
import { encodeName, encodeValue, getCookies, hasProperty, isString, stringifyAttributes } from '@sefaris/utilities';
import { cookieConverter } from './cookie-converter';

export enum CookieEventType {
  ON_REMOVE = 'onRemove',
  ON_CREATE = 'onCreate',
  ON_GET = 'onGet',
}

export type CookieEventListener = (cookie: CookieData) => void | Promise<void>;

export class CookiesCollection {
  [key: string | symbol]: unknown;

  static #cookies: Record<string, string>;

  #events: Record<CookieEventType, CookieEventListener[]> = {
    [CookieEventType.ON_CREATE]: [],
    [CookieEventType.ON_REMOVE]: [],
    [CookieEventType.ON_GET]: [],
  };
  #converter: CookieConverter = cookieConverter;
  #defaultOptions: CookieOptions = {
    path: '/',
    sameSite: 'Lax',
  };

  public readonly converter: Readonly<CookieConverter> = Object.freeze(cookieConverter);

  constructor(converter?: CookieConverter) {
    if (converter) {
      this.#converter = converter;
    }

    return this.#createProxy();
  }

  [Symbol.iterator]() {
    return Object.entries(CookiesCollection.#cookies);
  }

  #createProxy() {
    return new Proxy(this, {
      get: (target, key, receiver) => {
        if (!hasProperty(target, key) && isString(key)) {
          return target.get(key);
        }

        const value = Reflect.get(target, key, receiver);

        if (typeof value === 'function') {
          return value.bind(target);
        }

        return value;
      },
    });
  }

  #createCookie({ name, value, options = {} }: CookieData) {
    return `${name}=${value};${stringifyAttributes(options)}`;
  }

  #dispatch(type: CookieEventType, cookie: CookieData) {
    const listeners = this.#events[type];

    for (const listener of listeners) {
      const listenerTimeout = setTimeout(
        (cookie: CookieData) => {
          listener(cookie);

          clearTimeout(listenerTimeout);
        },
        0,
        cookie
      );
    }
  }

  #set({ name, value, options = {} }: CookieData) {
    const encodedValue = encodeValue(this.#converter.encode(value, name));
    const encodedName = encodeName(name);

    document.cookie = this.#createCookie({
      name: encodedName,
      value: encodedValue,
      options: { ...this.#defaultOptions, ...options },
    });

    return encodedValue;
  }

  public defaults(defaultOptions: CookieOptions) {
    this.#defaultOptions = defaultOptions;
  }

  public has(name: string) {
    name = encodeName(name);

    return new RegExp(`(${name})=(.*?)`).test(document.cookie);
  }

  public get<T extends CookieValue>(name: string): T | undefined;
  public get<T extends CookieValue>(): Readonly<Record<string, T>>;
  public get<T extends CookieValue = CookieValue>(name?: string): T | Readonly<Record<string, T>> | undefined {
    const cookies = getCookies();

    if (name) {
      const value = cookies[name];

      this.#dispatch(CookieEventType.ON_GET, { name, value });

      return this.#converter.decode(value, name) as T;
    }

    const decodedCookies: Record<string, CookieValue> = {};

    for (const cookieName in cookies) {
      const cookie =
        this.#converter !== this.converter ? this.#converter.encode(cookies[cookieName], cookieName) : cookies[cookieName];

      decodedCookies[cookieName] = this.#converter.decode(cookie, cookieName) as T;
    }

    return Object.freeze(decodedCookies) as T;
  }

  public create(name: string, value: CookieValue, options: CookieOptions = {}) {
    this.#set({ name, value, options });

    this.#dispatch(CookieEventType.ON_CREATE, { value, name });
  }

  public remove(name: string, options: CookieOptions = {}) {
    const cookie = this.get(name);

    if (!cookie) {
      return true;
    }

    this.#set({ name, value: cookie, options: { expires: -1, ...options } });

    if (this.has(name)) {
      return false;
    }

    this.#dispatch(CookieEventType.ON_REMOVE, { name, value: cookie });

    return true;
  }

  public removeEventListener(type: CookieEventType, listener: CookieEventListener) {
    this.#events[type] = this.#events[type].filter((item) => listener !== item);
  }

  public addEventListener(type: CookieEventType, listener: CookieEventListener) {
    this.#events[type].push(listener);
  }

  public onRemove(listener: CookieEventListener) {
    this.#events.onRemove.push(listener);
  }

  public onCreate(listener: CookieEventListener) {
    this.#events.onCreate.push(listener);
  }

  public onGet(listener: CookieEventListener) {
    this.#events.onGet.push(listener);
  }

  public withConverter(converter: Partial<CookieConverter>) {
    return new CookiesCollection({ ...this.#converter, ...converter });
  }
}

const Cookies = new CookiesCollection();

export { Cookies };
