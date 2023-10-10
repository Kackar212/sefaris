/* eslint-disable @typescript-eslint/no-unused-vars */
import { sefaris, EasyResponse } from '@sefaris/core';
import { DataType, RESPONSE_DEFAULT_CONTENT_TYPE, mimeSubTypes, mimeTypes } from '@sefaris/shared';
import { isBlob } from '@sefaris/utilities';
import fetchMock from 'jest-fetch-mock';

describe('EasyResponse', () => {
  afterEach(() => {
    fetchMock.resetMocks();
  });

  it('should parse response body to DOM if body has supported mime type by DOMParser', async () => {
    fetchMock.mockResponse('<div>foo</div>', { headers: { 'content-type': 'text/html' } });

    const response = await sefaris.get();

    expect(response.document).toBeInstanceOf(Node);
  });

  it('should be iterable', async () => {
    fetchMock.mockResponseOnce('[1, 2, 3]', { headers: { 'content-type': 'application/json' } });
    const arrayResponse = await sefaris.get('');

    for (const item of arrayResponse) {
      expect(typeof item).toBe('number');
    }

    fetchMock.mockResponseOnce('{ "foo": "bar" }', { headers: { 'content-type': 'application/json' } });
    const objectResponse = await sefaris.get('');

    for (const entries of objectResponse) {
      const [key, value] = entries as [string, string];

      expect(key).toBe('foo');
      expect(value).toBe('bar');
    }

    fetchMock.mockResponseOnce('foo');
    const stringResponse = await sefaris.get('');

    expect([...stringResponse]).toEqual(['f', 'o', 'o']);

    fetchMock.mockResponseOnce(JSON.stringify({ foo: 'bar' }), { headers: { 'content-type': 'application/octet' } });
    const arrayBufferResponse = await sefaris.get('');

    for (const _ of arrayBufferResponse) {
      fail();
    }

    expect.assertions(6);
  });

  describe('getResolveBody', () => {
    it('should parse response body per responseBodyType option', async () => {
      fetchMock.mockResponse(JSON.stringify({ foo: 'bar' }));

      const response = await sefaris.get<{ foo: string }>('http://example.com', { responseBodyType: DataType.JSON });

      expect(response.result).toStrictEqual({ foo: 'bar' });

      const secondResponse = await sefaris.get<Blob>('http://example.com', {
        responseBodyType: DataType.BLOB,
      });

      expect(isBlob(secondResponse.result)).toBe(true);
    });

    it('should parse response body per tryResolveBodyTo option', async () => {
      fetchMock.mockResponse(JSON.stringify({ foo: 'bar' }));

      const response = await sefaris.get<{ foo: string }>('http://example.com', {
        tryResolveBodyTo: DataType.JSON,
      });

      expect(response.result).toStrictEqual({ foo: 'bar' });

      const secondResponse = await sefaris.get<Blob>('http://example.com', {
        tryResolveBodyTo: DataType.BLOB,
      });

      expect(isBlob(secondResponse.result)).toBe(true);

      fetchMock.mockResponse('<foo>bar</foo>');

      const thirdResponse = await sefaris.get<string>('http://example.com', {
        tryResolveBodyTo: DataType.JSON,
        responseBodyType: DataType.TEXT,
      });

      expect(thirdResponse.result).toBe('<foo>bar</foo>');
    });
  });

  describe('getMimeType', () => {
    it(`should return ${RESPONSE_DEFAULT_CONTENT_TYPE} if provided content type is undefined and content-type header is not set`, async () => {
      fetchMock.mockResponseOnce('', { headers: { 'content-type': '' } });
      const response = await sefaris.get();

      expect(response.getMimeType()).toBe(RESPONSE_DEFAULT_CONTENT_TYPE);
    });
  });

  describe('header', () => {
    it('should return header', async () => {
      fetchMock.mockResponseOnce('', { headers: { 'content-type': 'text/plain' } });
      const response = await sefaris.get();

      expect(response.header('content-type')).toBe('text/plain');
    });
  });

  describe('getResponseBodyType', () => {
    it('should return string that is one of DataType', async () => {
      fetchMock.mockResponseOnce('<div>foo</div>', { headers: { 'Content-Type': 'text/html' } });
      const responseHtml = await sefaris.get();

      fetchMock.mockResponseOnce('<foo>bar</foo>', { headers: { 'Content-Type': 'application/xml' } });
      const responseXml = await sefaris.get();

      fetchMock.mockResponseOnce(JSON.stringify({ foo: 'bar' }), { headers: { 'Content-Type': 'application/json' } });
      const responseJson = await sefaris.get();

      fetchMock.mockResponseOnce('', { headers: { 'content-type': '' } });
      const responseWithoutContentType = await sefaris.get();

      expect(responseHtml.getResponseBodyType()).toBe('text');
      expect(responseXml.getResponseBodyType()).toBe('text');
      expect(responseJson.getResponseBodyType()).toBe('json');
      expect(responseWithoutContentType.getResponseBodyType()).toBe(DataType.ARRAY_BUFFER);
    });
  });

  describe('transformResult', () => {
    it('should transform response result with provided function', async () => {
      fetchMock.mockResponseOnce('<div>foo</div>', { headers: { 'Content-Type': 'text/html' } });
      const responseHtml = await sefaris.get('');

      const newResponse = await responseHtml.transformResult((result: string) => {
        result += '<baz>bar</baz>';

        return result;
      });

      expect(newResponse.result).toBe('<div>foo</div><baz>bar</baz>');
    });
  });

  describe('extendMimeType', () => {
    it('should let user extend or overwrite default mime types', () => {
      EasyResponse.extendMimeTypes({ foo: DataType.TEXT });

      expect(EasyResponse.mimeTypes).toEqual({ ...mimeTypes, foo: DataType.TEXT });
    });
  });

  describe('extendMimeSubTypes', () => {
    it('should let user extend or overwrite default mime sub types', () => {
      EasyResponse.extendMimeSubTypes({ bar: DataType.TEXT });

      expect(EasyResponse.mimeSubTypes).toEqual({ ...mimeSubTypes, bar: DataType.TEXT });
    });
  });
});
