import {
  createEasyRequest,
  defaults,
  EasyRequest,
  InterceptorManager,
  RequestOptions,
  sefaris,
  SefarisError,
  SefarisHeaders,
} from '@sefaris/core';

describe('InterceptorManager', () => {
  let interceptorManager: InterceptorManager<unknown>;
  const config: RequestOptions<unknown> = { ...defaults, url: '', headers: new SefarisHeaders() };

  beforeEach(() => {
    interceptorManager = new InterceptorManager<EasyRequest>();
  });

  describe('use', () => {
    it('should add interceptor and return its id', async () => {
      const id = interceptorManager.use(
        (easyRequest: EasyRequest) => {
          expect(easyRequest.config.url).toBe('');

          throw new SefarisError('err', SefarisError.BAD_CONFIG);
        },
        (err) => {
          expect(err.message).toBe('err');
        },
        {
          sync: true,
          callWhen() {
            return true;
          },
        }
      );

      const [interceptor] = interceptorManager.get(config);

      try {
        interceptor.onResolved(createEasyRequest(config));
      } catch (e) {
        if (!sefaris.isSefarisError(e)) fail();

        interceptor.onRejected?.call(null, e);
      }

      expect(id).toBe(0);
      expect.assertions(3);
    });
  });

  describe('get', () => {
    it('should return filtered interceptors by callWhen result', () => {
      interceptorManager.use(
        (e) => e,
        (err) => err,
        {
          callWhen(config) {
            return config.url !== '';
          },
        }
      );

      expect(interceptorManager.get({ ...defaults, url: '' }).length).toBe(0);
      expect(interceptorManager.get({ ...defaults, url: 'foo' }).length).toBe(1);
    });
  });

  describe('eject', () => {
    it('should remove interceptor', () => {
      const config = { ...defaults, url: '' };
      const id = interceptorManager.use((easyRequest) => {
        return easyRequest;
      });

      expect(interceptorManager.get(config).length).toBe(1);

      interceptorManager.eject(id);

      expect(interceptorManager.get(config).length).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all interceptors', () => {
      const config = { ...defaults, url: '' };
      interceptorManager.use(() => null);
      interceptorManager.use(() => null);
      interceptorManager.use(() => null);
      interceptorManager.use(() => null);

      expect(interceptorManager.get(config).length).toBe(4);

      interceptorManager.clear();

      expect(interceptorManager.get(config).length).toBe(0);
    });
  });

  it('should be iterable', () => {
    interceptorManager.use(() => null);
    interceptorManager.use(() => null);
    interceptorManager.use(() => null);

    for (const interceptor of interceptorManager) {
      expect(interceptor).toBe(interceptor);
    }

    expect.assertions(3);
  });
});
