import { sefaris, EasyRequest, EasyResponse, SefarisError } from '@sefaris/core';
import { Auth, DataType, Time } from '@sefaris/shared';

function fail(message?: string): never {
  throw new Error(message);
}

describe('sefaris', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    fetchMock.mockResponse(JSON.stringify({ id: 1 }));
  });

  it('should let user attach interceptors to request and response', async () => {
    fetchMock.mockResponseOnce('[1, 2, 3]', { headers: { 'content-type': 'application/json' } });

    sefaris.interceptors.request.use((easyRequest: EasyRequest) => {
      easyRequest.config.headers.set('content-type', 'application/json');

      return easyRequest;
    });

    sefaris.interceptors.response.use((easyResponse: EasyResponse<number[]>) => {
      easyResponse.result.splice(0, 1);

      return easyResponse;
    });

    const response = await sefaris.get('');

    expect(response.config.headers.get('content-type')).toBe('application/json');
    expect(response.result).toEqual([2, 3]);
  });

  it('should throw SefarisError of type BAD_CONFIG_ERROR if request has invalid config', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ id: 1 }));
    try {
      await sefaris.get('https://example.com', { timeout: 'xd' as Time });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      expect(e).toBeInstanceOf(SefarisError);
      expect(e.type).toBe(SefarisError.BAD_CONFIG);
    }

    fetchMock.mockResponseOnce(JSON.stringify({ id: 1 }));

    try {
      await sefaris.get('https://example.com', {
        query: 123 as unknown as string,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      expect(e.type).toBe(SefarisError.BAD_CONFIG);
    }

    try {
      await sefaris.get('https://example.com', {
        responseBodyType: 'foo' as DataType,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      expect(e.type).toBe(SefarisError.BAD_CONFIG);
    }

    expect.assertions(4);
  });

  describe('create', () => {
    it('should create new sefaris instance', () => {
      const newSefaris = sefaris.create({
        baseURL: 'http://example.com',
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(newSefaris.options.baseURL).toBe('http://example.com');
      expect(newSefaris.headers.get('content-type')).toBe('application/json');
    });
  });

  describe('request', () => {
    it('should make successful request', async () => {
      fetchMock.dontMockOnce();

      try {
        await sefaris.request({
          url: 'https://httpbin.org/get',
          defaultResult: 'co jest kurwa',
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        fail(e.message);
      }
    });

    it('should send request with authorization header specified by user', async () => {
      sefaris.auth(Auth.BASIC, ['username', 'password']);

      const responseBasic = await sefaris.request({ url: '', auth: true });

      const { headers } = responseBasic.request;

      expect(headers.has('Authorization')).toBe(true);
      expect(headers.get('Authorization')).toBe('Basic ' + btoa('username:password'));

      sefaris.auth(Auth.BEARER, 'token');

      const responseBearer = await sefaris.request({ url: '' });

      expect(responseBearer.request.headers.has('Authorization')).toBe(true);
      expect(responseBearer.request.headers.get('Authorization')).toBe('Bearer token');
    });
  });

  describe('config', () => {
    it('should set global options', () => {
      sefaris.config({
        baseURL: 'https://httpbin.org',
        headers: {
          foo: 'bar',
        },
      });

      expect(sefaris.options.baseURL).toBe('https://httpbin.org');
      expect(sefaris.headers.has('foo')).toBe(true);
      expect(sefaris.options.headers.has('foo')).toBe(true);
    });
  });

  describe('restoreDefaults', () => {
    it('should overwrite global options with default options and options provided by user', () => {
      sefaris.restoreDefaults({
        baseURL: 'https://example.com',
      });

      expect(sefaris.options.baseURL).toBe('https://example.com');
      expect(sefaris.headers.has('foo')).toBe(false);
      expect(sefaris.options.headers.has('foo')).toBe(false);
    });
  });

  describe('xhr', () => {
    it('should make successful request using xhr adapter', () => {
      sefaris.xhr.get();
    });
  });

  describe('method functions', () => {
    describe('get', () => {
      it('should make successful request with GET method', () => {
        try {
          sefaris.get();
        } catch {
          fail();
        }
      });
    });

    describe('post', () => {
      it('should make successful request with POST method', () => {
        try {
          sefaris.post();
        } catch {
          fail();
        }
      });
    });

    describe('patch', () => {
      it('should make successful request with PATCH method', () => {
        try {
          sefaris.patch();
        } catch {
          fail();
        }
      });
    });

    describe('put', () => {
      it('should make successful request with PUT method', () => {
        try {
          sefaris.put();
        } catch {
          fail();
        }
      });
    });

    describe('delete', () => {
      it('should make successful request with DELETE method', () => {
        try {
          sefaris.delete();
        } catch {
          fail();
        }
      });
    });
  });
});
