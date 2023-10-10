/* eslint-disable @typescript-eslint/no-unused-vars */
import { SefarisHeaders } from '@sefaris/core';

describe('SefarisHeaders', function () {
  let headers: SefarisHeaders;
  beforeEach(() => {
    headers = new SefarisHeaders({ 'Content-Type': 'application/json', Accept: ['text/xml', 'text/html'] });
  });

  test('should suport SefarisHeaders at init', function () {
    const newHeaders = new SefarisHeaders(headers);
    newHeaders.set('foo', 'bar');

    expect(newHeaders.all()).toMatchObject({
      'content-type': 'application/json',
      accept: 'text/xml, text/html',
      foo: 'bar',
    });
  });

  test('should suport SefarisHeadersInit at init', function () {
    const nativeHeaders = new Headers({ foo: 'bar' });
    const plainObjectHeaders = { foo1: 'bar', bar: ['foo'] };
    const entriesHeaders = [
      ['foo2', ['bar']],
      ['foo3', 'bar'],
    ] as HeadersInit;
    const methodHeaders = {
      baz: 'foo',
      post: {
        foo: 'bar',
      },
      get: {
        bar: 'foo',
      },
    };

    const headersWithNative = new SefarisHeaders(nativeHeaders);
    const headersWithPlainObject = new SefarisHeaders(plainObjectHeaders);
    const headersWithEntries = new SefarisHeaders(entriesHeaders);
    const headersWithMethods = new SefarisHeaders(methodHeaders);

    expect(headersWithNative.foo).toBe('bar');
    expect(headersWithPlainObject.foo1).toBe('bar');
    expect(headersWithEntries.foo2).toBe('bar');
    expect(headersWithPlainObject.bar).toBe('foo');
    expect(headersWithEntries.foo3).toBe('bar');
    expect(headersWithMethods.get('foo', { method: 'post' })).toBe('bar');
    expect(headersWithMethods.get('bar', { method: 'GeT' })).toBe('foo');
    expect(headersWithMethods.baz).toBe('foo');
  });

  test('should store raw value', function () {
    expect(headers.get('accept', { raw: true })).toMatchObject(['text/xml', 'text/html']);
  });

  test('should support access by property', function () {
    expect(headers.accept).toBe('text/xml, text/html');
    expect(headers['content-type']).toBe('application/json');
  });

  test('should support access by property with normalization', function () {
    headers.normalize();

    expect(headers.accept).toBe('text/xml, text/html');
    expect(headers['---accept---']).toBe('text/xml, text/html');
    expect(headers[' accept ']).toBe('text/xml, text/html');
    expect(headers.contentType).toBe('application/json');
    expect(headers['content_type']).toBe('application/json');
    expect(headers[' content  type ']).toBe('application/json');
  });

  describe('delete', function () {
    test('should remove header', function () {
      expect(headers.delete('accept')).toBe(true);
    });

    test('should support regexp filter', function () {
      expect(headers.delete('content-type', /text/)).toBe(false);
      expect(headers.delete('content-type', /application/)).toBe(true);
    });

    test('should support function filter', function () {
      expect(headers.delete('content-type', (headerValue) => headerValue.includes('text'))).toBe(false);
      expect(headers.delete('content-type', { filter: (headerValue) => headerValue.includes('application') })).toBe(true);
    });
  });
  describe('all', function () {
    it('should support filter', () => {
      expect(headers.all(/abc/));
      expect(headers.all({ filter: /abc/ }));
    });
  });

  describe('get', function () {
    test('should return header value if header exists', function () {
      expect(headers.get('content-type')).toBe('application/json');
      expect(headers.get('accept')).toBe('text/xml, text/html');
    });

    test('should support normalization of header name', function () {
      headers.normalize();

      expect(headers.get('contentType')).toBe('application/json');
      expect(headers.get('content_type')).toBe('application/json');
      expect(headers.get('--content---type--')).toBe('application/json');
      expect(headers.get('  content type  ')).toBe('application/json');
    });

    test('should support regexp filter', function () {
      expect(headers.get('content-type', /application\/.*/)).toBe('application/json');
      expect(headers.get('content-type', { filter: /text\/.*/ })).toBe(undefined);
      expect(headers.get('accept', /text\/.*/)).toBe('text/xml, text/html');
      expect(headers.get('accept', { filter: /^text\/html$/ })).toBe(undefined);
    });

    test('should support function filter', function () {
      expect(
        headers.get('content-type', function (headerValue: string | string[]) {
          return headerValue === 'application/json';
        })
      ).toBe('application/json');
      expect(
        headers.get('accept', {
          filter: function (headerValue) {
            return headerValue === 'foo';
          },
        })
      ).toBe(undefined);
    });

    test('should support path as header name for method headers', () => {
      headers.set({
        post: {
          foo: 'bar',
        },
        get: {
          bar: 'foo',
        },
      });

      expect(headers.get('post.foo')).toBe('bar');
      expect(headers.get('get.bar')).toBe('foo');
    });
  });

  describe('append', function () {
    test('should support adding multiple headers', function () {
      headers.append({ range: 'foo', authorization: 'bar' });

      expect(headers.has('range') && headers.has('authorization')).toBe(true);
    });

    test('should support adding single header', function () {
      headers.append('foo', 'bar');

      expect(headers.has('foo')).toBe(true);
    });

    test('should not overwrite header', function () {
      headers.append('accept', 'application/json');

      expect(headers.accept).toBe('text/xml, text/html, application/json');
    });
  });

  describe('set', function () {
    test('should support adding multiple headers', function () {
      headers.set({ range: 'foo', authorization: 'bar' });

      expect(headers.has('range') && headers.has('authorization')).toBe(true);
    });

    test('should support adding single header', function () {
      headers.set('foo', 'bar');

      expect(headers.has('foo')).toBe(true);
    });

    test('should overwrite header', function () {
      headers.set('accept', 'application/json');

      expect(headers.accept).toBe('application/json');
    });

    test('should support adding header for methods', () => {
      headers.set({
        post: {
          foo: 'bar',
        },
        get: {
          baz: 'bar',
        },
      });
      headers.set('put.foo', 'bar');

      expect(headers.methodHeaders.post.foo).toBe('bar');
      expect(headers.get('foo', { method: 'post' })).toBe('bar');
      expect(headers.get('baz', { method: 'get' })).toBe('bar');
      expect(headers.get('put.foo')).toBe('bar');
    });
  });

  describe('has', function () {
    test('should return true if header exists', function () {
      expect(headers.has('content-type')).toBe(true);
      expect(headers.has('foo')).toBe(false);
    });

    test('should support normalization of header name', function () {
      headers.normalize();

      expect(headers.has('contentType')).toBe(true);
      expect(headers.has('content_type')).toBe(true);
      expect(headers.has('--content---type--')).toBe(true);
      expect(headers.has('  content type  ')).toBe(true);

      headers.normalize(false);

      expect(headers.has('content_type', { normalize: true })).toBe(true);
    });

    test('should support regexp filter', function () {
      expect(headers.has('content-type', /application\/json/)).toBe(true);
      expect(headers.has('content-type', { filter: /application\/html/ })).toBe(false);
      expect(headers.has('accept', /text\/.*/)).toBe(true);
      expect(headers.has('accept', { filter: /^text\/html$/ })).toBe(false);
    });

    test('should support function filter', function () {
      function filter(headerValue: string | string[]) {
        return headerValue === 'application/json';
      }

      expect(headers.has('content-type', { filter })).toBe(true);
      expect(
        headers.has('accept', function (headerValue) {
          return headerValue === 'foo';
        })
      ).toBe(false);
    });

    test('should support method headers', () => {
      headers.set({
        post: {
          foo: 'bar',
        },
        get: {
          bar: 'foo',
        },
      });

      expect(headers.has('post.foo')).toBe(true);
      expect(headers.has('bar', { method: 'get' })).toBe(true);
      expect(headers.has('get.bar')).toBe(true);
      expect(headers.has('post.baz')).toBe(false);
    });
  });

  describe('forEach', () => {
    it('should iterate over all headers', () => {
      let index = 0;
      headers.forEach(() => {
        index++;
      });

      expect(index).toBe(headers.length);
    });
  });

  describe('find', () => {
    it('it should find header that satisfies the provided testing function', () => {
      const [_, header] = headers.find((_, headerName) => headerName === 'accept') || [];
      expect(header).toBe('text/xml, text/html');
    });
  });

  describe('toString', () => {
    it('should return headers as json', () => {
      expect(headers.toString()).toBe(
        JSON.stringify({
          accept: ['text/xml', 'text/html'],
          'content-type': 'application/json',
        })
      );
    });
  });

  describe('toJSON', () => {
    it("should return normal headers and methods' headers as json", () => {
      expect(headers.toJSON()).toBe(
        JSON.stringify({
          accept: 'text/xml, text/html',
          'content-type': 'application/json',
        })
      );
    });
  });

  describe('keys', () => {
    it('should returns array iterator that contains names of stored headers', () => {
      expect([...headers.keys()]).toEqual(['accept', 'content-type']);
    });
  });

  describe('values', () => {
    it('should returns array iterator that contains values of stored headers', () => {
      expect([...headers.values()]).toEqual(['text/xml, text/html', 'application/json']);

      headers.set({ post: { foo: 'bar' } });
      expect([...headers.values({ method: 'post' })]).toEqual(['bar', 'text/xml, text/html', 'application/json']);
    });
  });

  describe('native', () => {
    it('should return stored headers as Headers instance', () => {
      const nativeHeaders = headers.native();
      expect(nativeHeaders).toBeInstanceOf(Headers);
      expect(nativeHeaders.has('accept')).toBe(true);
      expect(nativeHeaders.has('content-type')).toBe(true);
      expect([...nativeHeaders.values()]).toEqual(['text/xml,text/html', 'application/json']);
    });
  });

  describe('create', () => {
    it('should create SefarisHeaders instance', () => {
      const sefarisHeaders = headers.create('content-type: application/json');

      expect(sefarisHeaders.has('content-type')).toBe(true);
      expect(sefarisHeaders.get('content-type')).toBe('application/json');
    });
  });
});
