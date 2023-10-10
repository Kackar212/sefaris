import { isFormData } from '@sefaris/utilities';
import { defaults, EasyRequest, createEasyRequest, SefarisHeaders } from '@sefaris/core';
import { DEFAULT_CONTENT_TYPE } from '@sefaris/shared';

describe('testing EasyRequest class', function () {
  let easyRequest: EasyRequest<{ id: number }>;

  const somethingIterable = {
    [Symbol.iterator]() {
      const entries: [string, unknown][] = [
        ['post', { foo: 'bar' }],
        ['baz', 'foo'],
      ];
      return entries.values();
    },
  };

  beforeEach(() => {
    easyRequest = createEasyRequest({ ...defaults, url: 'http://example.com' });
  });

  describe('createEasyRquest', () => {
    it('should create EasyRequest instace', function () {
      expect(easyRequest).toBeInstanceOf(EasyRequest);
    });
  });

  describe('options', () => {
    it('should set request options', () => {
      easyRequest.options({
        headers: SefarisHeaders.from({
          'content-type': 'text/plain',
        }),
        url: 'https://www.foo.com',
      });

      expect(easyRequest.headers.get('content-type')).toBe('text/plain');
      expect(easyRequest.url.toString()).toBe('https://www.foo.com/');
    });
  });

  describe('transformBody', () => {
    it('should support zero tranformRequestBody functions', () => {
      easyRequest.config.transformRequestBody = [];

      expect(easyRequest.transformBody('2')).toBe('2');
    });

    it('should support multiple transform functions', () => {
      easyRequest.config.transformRequestBody = [(body) => body + '2', (body) => body + '2'];

      expect(easyRequest.transformBody('2')).toBe('222');
    });

    it('should parse body to JSON', function () {
      easyRequest.headers.set('content-type', 'application/json');

      expect(easyRequest.transformBody({ foo: 'bar' })).toBe(JSON.stringify({ foo: 'bar' }));

      const formData = new FormData();
      formData.append('foo[baz]', 'bar');

      expect(easyRequest.transformBody(formData)).toBe(JSON.stringify({ foo: { baz: 'bar' } }));

      expect(easyRequest.transformBody(new URLSearchParams({ 'foo[bar]': 'baz' }))).toBe(
        JSON.stringify({ foo: { bar: 'baz' } })
      );

      expect(easyRequest.transformBody(somethingIterable)).toBe(JSON.stringify({ post: { foo: 'bar' }, baz: 'foo' }));
    });

    test('should parse body to XML', function () {
      const node = new DOMParser().parseFromString('<foo>bar</foo>', 'application/xml');

      expect(easyRequest.transformBody(node)).toBe('<foo>bar</foo>');
    });

    test('should parse body to FormData', function () {
      const form = document.createElement('form');

      expect(isFormData(easyRequest.transformBody(form))).toBe(true);

      easyRequest.headers.set('content-type', 'multipart/form-data');
      const body = easyRequest.transformBody({ foo: { bar: 'baz' } });

      expect(isFormData(body)).toBe(true);

      if (isFormData(body)) {
        const entries = [['foo[bar]', 'baz']];
        expect([...body.entries()]).toEqual(entries);
      }

      const bodyFromIterable = easyRequest.transformBody(somethingIterable);
      expect(isFormData(bodyFromIterable)).toBe(true);

      if (isFormData(bodyFromIterable)) {
        const entries = [
          ['post[foo]', 'bar'],
          ['baz', 'foo'],
        ];

        expect([...bodyFromIterable.entries()]).toEqual(entries);
      }
    });

    test('should parse body to urlencoded form data', function () {
      expect(easyRequest.transformBody(new URLSearchParams({ foo: 'bar', baz: 'foo' }))?.toString()).toBe('foo=bar&baz=foo');

      easyRequest.headers.set('content-type', DEFAULT_CONTENT_TYPE);

      expect(easyRequest.transformBody({ foo: 'bar', baz: 'foo' })?.toString()).toBe('foo=bar&baz=foo');

      expect(decodeURIComponent(easyRequest.transformBody(somethingIterable)?.toString() as string)).toBe(
        'post[foo]=bar&baz=foo'
      );
    });
  });

  describe('option', () => {
    it('should return request config option value', () => {
      const url = easyRequest.option('url');

      expect(url).toBe('http://example.com');
    });
  });

  test('should parse url', function () {
    easyRequest.options({
      url: 'http://example.com/{{slug}}/{{id}}',
      query: {
        perPage: '10',
      },
      parameters: {
        slug: 'posts',
        id: 1,
      },
    });

    expect(easyRequest.url.toString()).toBe('http://example.com/posts/1?perPage=10');
  });
});
