import { CookieEventType, Cookies, CookiesCollection } from '@sefaris/core';
import { isPlainObject } from '@sefaris/utilities';

describe('CookiesCollection', () => {
  beforeEach(() => {
    Cookies.create('foo', 'bar');
  });

  it('should return new CookieCollection instance with provided converter', () => {
    const decode = jest.fn((cookieValue) => {
      return atob(cookieValue);
    });

    const encode = jest.fn((cookieValue: string) => {
      return btoa(cookieValue);
    });

    const cookies = new CookiesCollection({
      decode,
      encode,
    });

    expect(cookies.get()).toEqual({ foo: 'bar' });

    cookies.create('bar', 'foo');

    expect(cookies.get('bar')).toBe('foo');
    expect(decode).toBeCalledTimes(2);
    expect(encode).toBeCalledTimes(2);
  });

  describe('has', () => {
    it('should return true if cookie with provided name exists otherwise false', () => {
      expect(Cookies.has('foo')).toBe(true);
      expect(Cookies.has('baz')).toBe(false);
    });
  });

  describe('create', () => {
    it('should create cookie', () => {
      Cookies.create('bar', 'foo');

      expect(Cookies.has('bar')).toBe(true);
      expect(Cookies.get('bar')).toBe('foo');
    });
  });

  describe('get', () => {
    it('should return all cookies as plain object if cookie name is not provided', () => {
      const cookies = Cookies.get();

      expect(isPlainObject(cookies)).toBe(true);
      expect(cookies.foo).toBe('bar');
    });

    it('should return cookie with provided name', () => {
      Cookies.create('foo_bar', 'bar');

      expect(Cookies.get('foo_bar')).toBe('bar');
    });
  });

  describe('remove', () => {
    it('should remove cookie with provided name and return true if cookie as deleted otherwise false', () => {
      expect(Cookies.remove('foo')).toBe(true);
      expect(Cookies.has('foo')).toBe(false);
    });

    it("should return true if cookie already don't exists", () => {
      expect(Cookies.remove('baz')).toBe(true);
    });
  });

  describe('addEventListener', () => {
    it('should add listener for provided event', () => {
      jest.useFakeTimers();

      const listener = jest.fn((cookie) => {
        expect(cookie.value).toBe('foo');
      });

      Cookies.addEventListener(CookieEventType.ON_CREATE, listener);

      Cookies.create('baz', 'foo');

      jest.runAllTimers();

      expect(listener).toBeCalled();

      Cookies.removeEventListener(CookieEventType.ON_CREATE, listener);
    });
  });

  describe('onRemove', () => {
    it('should add listener for onRemove event', () => {
      jest.useFakeTimers();

      Cookies.onRemove((cookie) => {
        expect(cookie.value).toBe('bar');
      });

      Cookies.remove('foo');

      jest.runAllTimers();

      expect.assertions(1);
    });
  });

  describe('onCreate', () => {
    it('should add listener for onCreate event', () => {
      jest.useFakeTimers();

      Cookies.onCreate((cookie) => {
        expect(cookie.value).toBe('foo');
      });

      Cookies.create('baz', 'foo');

      jest.runAllTimers();

      expect.assertions(1);
    });
  });

  describe('onGet', () => {
    it('should add listener for onGet event', () => {
      jest.useFakeTimers();

      Cookies.onGet((cookie) => {
        expect(cookie.value).toBe('bar');
      });

      Cookies.get('foo');

      jest.runAllTimers();

      expect.assertions(1);
    });
  });

  describe('removeEventListener', () => {
    it('should remove listener for provided event', () => {
      jest.useFakeTimers();

      const listener = jest.fn();

      Cookies.addEventListener(CookieEventType.ON_GET, listener);
      Cookies.removeEventListener(CookieEventType.ON_GET, listener);

      Cookies.get('foo');

      jest.runAllTimers();

      expect(listener).not.toBeCalled();
    });
  });

  describe('withConverter', () => {
    it('should return CookiesCollection instance with provided converter', () => {
      const cookies = Cookies.withConverter({
        decode(cookieValue) {
          expect(cookieValue).toBe(btoa('foo'));

          return atob(cookieValue);
        },

        encode(cookieValue: string) {
          expect(cookieValue).toBe('foo');

          return btoa(cookieValue);
        },
      });

      cookies.create('bar', 'foo');

      expect(cookies.get('bar')).toBe('foo');
    });
  });

  describe('defaults', () => {
    it('should set default cookie attributes', () => {
      Cookies.defaults({ path: '/foo', expires: 1000 });
    });
  });
});
