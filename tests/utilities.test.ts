/* eslint-disable @typescript-eslint/no-explicit-any */
import { Time, Visitable } from '@sefaris/shared';
import {
  TimeParser,
  isArrayFlat,
  toFormData,
  createFromEntries,
  getFromPath,
  getAsciiWords,
  isCamelCase,
  normalizeHeader,
  isValidURL,
  URLResult,
  getResponseBodyType,
  getMimeType,
  buildURL,
  isNumber,
} from '@sefaris/utilities';

describe('utils', function () {
  describe('getResponseBodyType', function () {
    test('should return correct response body type', async function () {
      expect(getResponseBodyType('application/json')).toBe('json');
      expect(getResponseBodyType('image/png')).toBe('blob');
      expect(getResponseBodyType('text/html')).toBe('text');
      expect(getResponseBodyType('text/html; text/xml;')).toBe('text');
    });
  });

  describe('getMimeType', () => {
    it('should return mimeType', () => {
      expect(getMimeType('application/json')).toBe('application/json');
      expect(getMimeType('text/html; text/xml;')).toBe('text/html');
    });
  });

  describe('getFromPath', () => {
    it('should return value at provided path', () => {
      expect(getFromPath([0, 1, 2], '-1')).toBe(2);
      expect(getFromPath([0, 1, 2], '-3')).toBe(0);
      expect(getFromPath({ arr: [0, 1, 2] }, 'arr[-1]')).toBe(2);
      expect(getFromPath({ arr: [0, 1, 2] }, 'arr.-1')).toBe(2);
      expect(getFromPath({ arr: [0, 1, 2] }, 'arr[0]')).toBe(0);
      expect(getFromPath({ foo: { bar: [1, 2, 3] } }, 'foo.bar[0]')).toBe(1);
      expect(getFromPath({ foo: { bar: [1, 2, 3] } }, 'foo[bar][0]')).toBe(1);
      expect(getFromPath({ foo: { bar: [1, 2, 3] } }, 'foo.bar')).toEqual([1, 2, 3]);
      expect(getFromPath({ foo: { bar: [1, 2, 3] } }, 'foo')).toEqual({ bar: [1, 2, 3] });
    });

    it('should throw error if provided value is not visitable', () => {
      expect(() => getFromPath('' as unknown as Visitable, 'path')).toThrow();
    });

    it('should throw error if currently visited value is array and key is not numerical', () => {
      expect(() => getFromPath({ foo: [1, 2, 3] }, 'foo.bar')).toThrow();
    });
  });

  describe('createFromEntries', () => {
    it('should return empty object when first argument is not an array of arrays, empty array or not array', () => {
      expect(createFromEntries([])).toMatchObject({});
      expect(createFromEntries([1] as Iterable<[string, unknown]>)).toMatchObject({});
      expect(createFromEntries(1 as unknown as Iterable<[string, unknown]>)).toMatchObject({});
      expect(createFromEntries([['foo', 'bar'], 'baz'] as unknown as Iterable<[string, unknown]>)).toMatchObject({});
    });

    it('should return partial object if key is not string', () => {
      expect(
        createFromEntries([
          ['x', 2],
          [1, 1],
        ] as Iterable<[string, unknown]>)
      ).toMatchObject({ x: 2 });
    });

    it('should return object created from entries', () => {
      const entries: Iterable<[string, unknown]> = [
        ['foo', 'bar'],
        ['bar', 'baz'],
      ];
      expect(createFromEntries(entries)).toMatchObject({ foo: 'bar', bar: 'baz' });
    });

    it('should support path as a key', () => {
      const entries: Array<[string, unknown]> = [
        ['foo.bar', 'baz'],
        ['baz.foo', 'bar'],
        ['foo[baz][0][bar][1][0][baz]', [1, 2, 3]],
      ];

      expect(createFromEntries(entries)).toMatchObject({
        foo: { bar: 'baz', baz: [{ bar: [undefined, [{ baz: [1, 2, 3] }]] }] },
        baz: { foo: 'bar' },
      });
    });

    it('should parse json string if key ends with {}', () => {
      const obj = createFromEntries([['json{}', JSON.stringify({ foo: 'bar' })]]);
      expect(obj).toEqual({ json: { foo: 'bar' } });
    });
  });

  describe('TimeParser', () => {
    it('should support correct units', () => {
      expect(TimeParser.getMiliseconds('1s')).toBe(1000);
      expect(TimeParser.getMiliseconds('1min')).toBe(60000);
      expect(TimeParser.getMiliseconds('1h')).toBe(3600000);
      expect(TimeParser.getDays('1d')).toBe(1);
      expect(TimeParser.getDays('1m')).toBe(30);
      expect(TimeParser.getDays('1y')).toBe(365);
    });

    it('should return BAD_CONFIG_ERROR if provided value contains incorrect syntax', () => {
      expect(() => TimeParser.getMiliseconds('1x' as Time)).toThrow('Invalid TimeParser syntax: 1x');
    });
  });

  describe('toFormData', () => {
    it('should parse valid provided value to FormData or URLSearchParams', () => {
      expect([
        ...toFormData({
          foo: {
            bar: [
              [1, 2, 3],
              [4, 5, 6],
            ],
          },
        }),
      ]);
    });

    it('should return empty form data if provided data cannot be converted to plain object with Object.fromEntries', () => {
      expect([...toFormData(0 as any)]).toEqual([]);
      expect([...toFormData('foo' as any)]).toEqual([]);
      expect([...toFormData(new URL('https://foo.bar') as any)]).toEqual([]);
      expect([...toFormData([1, 2, 3] as any)]).toEqual([]);
    });

    it('should support plain object', () => {
      const obj = { foo: 'bar', bar: 'baz' };
      expect([...toFormData(obj)]).toMatchObject(Object.entries(obj));
    });

    it('should support entries', () => {
      const entries: [string, string][] = [
        ['foo', 'bar'],
        ['bar', 'baz'],
      ];
      expect([...toFormData(entries)]).toEqual(entries);
    });

    it('should parse Date object to ISO string', () => {
      const date = new Date();
      expect([...toFormData({ date })]).toEqual([['date', date.toISOString()]]);
    });

    it('should support path that ends with []', () => {
      expect([...toFormData({ 'values[]': [1, 2, 3, null] })]).toEqual([
        ['values[0]', '1'],
        ['values[1]', '2'],
        ['values[2]', '3'],
        ['values[3]', ''],
      ]);

      expect([...toFormData({ 'values[]': 1 })]).toEqual([['values[0]', '1']]);
    });

    it('should set different paths depending on FormSerializer options', () => {
      expect([...toFormData({ 'values[]': [1, 2, 3, null] }, { indexes: false })]).toEqual([
        ['values[]', '1'],
        ['values[]', '2'],
        ['values[]', '3'],
        ['values[]', ''],
      ]);

      expect([...toFormData({ 'values[]': [1, 2, 3, null] }, { indexes: null })]).toEqual([
        ['values', '1'],
        ['values', '2'],
        ['values', '3'],
        ['values', ''],
      ]);

      expect([...toFormData({ x: { 'values[]': [1, 2, 3, null] } }, { dots: true })]).toEqual([
        ['x.values.0', '1'],
        ['x.values.1', '2'],
        ['x.values.2', '3'],
        ['x.values.3', ''],
      ]);

      expect([...toFormData({ x: { 'values[]': [1, 2, 3, null] } }, { dots: true, indexes: false })]).toEqual([
        ['x.values[]', '1'],
        ['x.values[]', '2'],
        ['x.values[]', '3'],
        ['x.values[]', ''],
      ]);

      expect([...toFormData({ x: { 'values[]': [1, 2, 3, null] } }, { dots: true, indexes: null })]).toEqual([
        ['x.values', '1'],
        ['x.values', '2'],
        ['x.values', '3'],
        ['x.values', ''],
      ]);
    });

    it('should support user defined meta tokens', () => {
      expect([
        ...toFormData(
          { x: { 'values#': [1, 2, 3, null], 'values{}': [1, 2, 3, null] } },
          {
            dots: true,
            indexes: null,
            metaTokens: [
              {
                token: '#',
                handle: (value: Array<number | null>) =>
                  value.reduce<number>((sum, value) => (isNumber(value) ? sum + Math.pow(value, 2) : sum), 0).toString(),
              },
            ],
          }
        ),
      ]).toEqual([
        ['x.values#', '14'],
        ['x.values{}', JSON.stringify([1, 2, 3, null])],
      ]);
    });

    it('should support iterable', () => {
      const iterable = {
        [Symbol.iterator](): IterableIterator<string[]> {
          return [
            ['foo', 'bar'],
            ['bar', 'baz'],
          ].values();
        },
      };

      expect([...toFormData(iterable)]).toMatchObject([
        ['foo', 'bar'],
        ['bar', 'baz'],
      ]);
    });

    it('should support URLSearchParams', () => {
      const urlSearchParams = new URLSearchParams({ foo: 'bar', bar: 'baz' });
      expect([...toFormData(urlSearchParams)]).toMatchObject([...urlSearchParams]);
    });

    it('should support nested objects as entries, plain object or iterable', () => {
      const obj = { foo: { bar: 'baz', foo: null } };
      const entries = Object.entries(obj);
      const iterable = {
        [Symbol.iterator]() {
          return entries.values();
        },
      };

      expect([...toFormData(entries)]).toMatchObject([
        ['foo[bar]', 'baz'],
        ['foo[foo]', ''],
      ]);
      expect([...toFormData(obj)]).toMatchObject([
        ['foo[bar]', 'baz'],
        ['foo[foo]', ''],
      ]);
      expect([...toFormData(iterable)]).toMatchObject([
        ['foo[bar]', 'baz'],
        ['foo[foo]', ''],
      ]);
    });

    it('should support key that ends with {}', () => {
      const jsonObject = { foo: 'bar' };

      expect([...toFormData({ 'json{}': jsonObject })]).toEqual([['json{}', JSON.stringify(jsonObject)]]);
    });

    it('should support iterable value', () => {
      const iterable = {
        [Symbol.iterator]() {
          return [1, 2, 3].values();
        },
      };

      expect([...toFormData({ 'values[]': iterable })]).toEqual([
        ['values[0]', '1'],
        ['values[1]', '2'],
        ['values[2]', '3'],
      ]);
    });

    it('should throw error if circual reference is detected', () => {
      const obj: { circular?: unknown } = {};
      obj.circular = obj;

      try {
        toFormData(obj);
      } catch (e) {
        if (e instanceof Error) {
          expect(e.message).toContain('Circular reference detected at circular');
        }
      }

      expect.assertions(1);
    });
  });

  describe('isCamelCase', () => {
    it('should return true if string is in camelCase', () => {
      expect(isCamelCase('foo')).toBe(true);
      expect(isCamelCase('Foo')).toBe(false);
      expect(isCamelCase('fooBar')).toBe(true);
      expect(isCamelCase('FooBar')).toBe(false);
    });
  });

  describe('getAsciiWords', () => {
    it('should return ascii words as an array', () => {
      const text = 'foo-bar!baz';

      expect(getAsciiWords(text)).toEqual(['foo', 'bar', 'baz']);
      expect(getAsciiWords('!')).toEqual([]);
    });
  });

  describe('normalizeHeader', () => {
    it('should return normalized header', () => {
      expect(normalizeHeader('foo  bar  baz')).toEqual('foo-bar-baz');
      expect(normalizeHeader('foo--bar-baz')).toEqual('foo-bar-baz');
      expect(normalizeHeader('foo  bar--baz')).toEqual('foo-bar-baz');
      expect(normalizeHeader('foo+++bar+++baz')).toEqual('foo-bar-baz');
      expect(normalizeHeader('fooBarBaz')).toBe('foo-bar-baz');
    });
  });

  describe('URLResult', () => {
    describe('toString and valueOf', () => {
      it('should return url as string', () => {
        const url = new URLResult(new URL('/foo', 'http://example.com'));

        expect(url.toString()).toBe('http://example.com/foo');
        expect(url.valueOf()).toBe('http://example.com/foo');
      });
    });

    describe('decode', () => {
      it('should return decoded form of url', () => {
        const url = new URLResult(new URL('/foo?bar=%20baz%20', 'http://example.com'));

        expect(url.decode()).toBe('http://example.com/foo?bar= baz ');
      });
    });

    describe('encode', () => {
      it('should return encoded form of url', () => {
        const url = new URLResult('http://example.com/foo?bar= baz[foo]');

        expect(url.encode()).toBe('http://example.com/foo?bar=%20baz%5Bfoo%5D');
      });
    });
  });

  describe('sefarisURL', () => {
    describe('build', () => {
      it('should return url that will contain provided baseURL, parameters and query', () => {
        const url = buildURL('/{{slug}}/{{foo.bar}}?foo=bar', {
          baseURL: 'http://example.com/api',
          parameters: { slug: 'foo', foo: { foo: 'baz' } },
          query: { bar: 'baz' },
        });

        const urlQueryAsString = buildURL('/{{slug}}/{{foo.bar}}?foo=bar', {
          baseURL: 'http://example.com/api',
          parameters: { slug: 'foo', foo: { bar: 'baz' } },
          query: 'bar=baz',
        });

        const urlWithoutParameters = buildURL('/foo?foo=bar', {
          baseURL: 'http://example.com/api',
          query: new URL('http://example.com/api?bar=baz'),
        });

        const urlWithoutBaseURL = buildURL('http://example.com/api/foo?foo=bar', {
          query: new URL('http://example.com/api?bar=baz'),
        });

        const urlWithURLSearchParams = buildURL('http://example.com/api/foo?foo=bar', {
          query: new URLSearchParams({ bar: 'baz' }),
        });

        expect(url.toString()).toBe('http://example.com/foo/%7B%7Bfoo.bar%7D%7D?foo=bar&bar=baz');
        expect(urlQueryAsString.toString()).toBe('http://example.com/foo/baz?foo=bar&bar=baz');
        expect(urlWithoutParameters.toString()).toBe('http://example.com/foo?foo=bar&bar=baz');
        expect(urlWithoutBaseURL.toString()).toBe('http://example.com/api/foo?foo=bar&bar=baz');
        expect(urlWithURLSearchParams.toString()).toBe('http://example.com/api/foo?foo=bar&bar=baz');
      });
    });
  });

  describe('isValidURL', () => {
    it('should return true if provided value is valid url otherwise return false', () => {
      expect(isValidURL('foo')).toBe(false);
      expect(isValidURL('http://example.com')).toBe(true);
      expect(isValidURL('https://example.com/foo')).toBe(true);
      expect(isValidURL('foo=bar')).toBe(false);
      expect(isValidURL('/foo')).toBe(false);
    });
  });

  describe('isArrayFlat', () => {
    it('should return true if array contains only primitive values', () => {
      expect(isArrayFlat([])).toBe(true);
      expect(isArrayFlat([1, 2, 3])).toBe(true);
      expect(isArrayFlat([[]])).toBe(false);
      expect(isArrayFlat([{}])).toBe(false);
      expect(isArrayFlat([{}, [], 1, 2])).toBe(false);
      expect(isArrayFlat([{ foo: 'bar' }, [1, 2], 1, 2, null])).toBe(false);
    });
  });
});
