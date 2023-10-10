import { SefarisHeaders, fetchAdapter, createEasyRequest, defaults, sefaris, SefarisError } from '@sefaris/core';
import { DataType } from 'src';

describe('fetchAdapter', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    fetchMock.mockResponse(() => new Promise((resolve) => setTimeout(() => resolve(JSON.stringify({ id: 1 })), 500)));
  });

  it('should let browser set content-type header if body is form data', async () => {
    const easyRequest = createEasyRequest({
      ...defaults,
      url: '',
      body: new FormData(),
      method: 'POST',
      headers: new SefarisHeaders(),
    });

    const response = await fetchAdapter(easyRequest);

    expect(response.request.headers.has('content-type')).toBe(false);
  });

  it('should throw SefarisError of type BAD_CONFIG_ERROR when provided config is invalid', async () => {
    try {
      await fetchAdapter(
        createEasyRequest({
          ...defaults,
          url: 'https://httpbin.org/get',
          responseBodyType: 'foo' as DataType,
        })
      );

      fail();
    } catch (e) {
      if (!sefaris.isSefarisError(e)) fail();

      expect(e.type).toBe(SefarisError.BAD_CONFIG);
    }
  });

  it('should let user set timeout of the request', async () => {
    const easyRequest = createEasyRequest({
      ...defaults,
      timeout: 1,
      url: 'https://httpbin.org/',
      headers: SefarisHeaders.from({ 'content-type': 'application/json' }),
    });

    try {
      await fetchAdapter(easyRequest);
    } catch (e) {
      if (sefaris.isSefarisError(e)) {
        expect(e.type).toBe(SefarisError.TIMEOUT);
        expect(e.cause).toBe('Request timed out');
      }
    }

    expect.assertions(2);
  });
});
