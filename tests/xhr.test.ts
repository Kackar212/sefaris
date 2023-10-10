import {
  xhrAdapter,
  defaults,
  SefarisHeaders,
  createEasyRequest,
  SefarisError,
  RequestOptions,
  sefaris,
  XhrOptions,
} from '@sefaris/core';
import { HttpMethod, DataType } from '@sefaris/shared';

function fail(message?: string): never {
  throw new Error(message);
}

describe('xhr', () => {
  document.body.innerHTML = `
    <progress max="100" value="0"></progress>
  `;
  const progress = document.querySelector('progress');
  if (!progress) fail("element <progress> doesn't exist");

  afterEach(() => {
    progress.value = 0;
  });

  it('should support state listeners', async () => {
    const state: XhrOptions<unknown>['state'] = {
      unsent() {
        expect(this.readyState).toBe(this.UNSENT);
      },
      opened() {
        expect(this.readyState).toBe(this.OPENED);
      },
      headersReceived() {
        expect(this.readyState).toBe(this.HEADERS_RECEIVED);
      },
      loading() {
        expect(this.readyState).toBe(this.LOADING);
      },
      done() {
        expect(this.readyState).toBe(this.DONE);
      },
    };

    await xhrAdapter(
      createEasyRequest({
        ...defaults,
        url: 'https://httpbin.org/get',
        state,
      })
    );

    expect.assertions(5);
  });

  it('should support setting headers', async () => {
    const response = await xhrAdapter(
      createEasyRequest({
        ...defaults,
        url: 'https://httpbin.org/get',
        headers: SefarisHeaders.from([['foo', 'bar']]),
      })
    );

    expect([...response.request.headers]).toEqual([['foo', 'bar']]);
  });

  it('should let set browser content-type if body is FormData', async () => {
    const response = await xhrAdapter(
      createEasyRequest({
        ...defaults,
        url: 'https://httpbin.org/post',
        method: HttpMethod.POST,
        body: new FormData(),
      })
    );

    expect(response.config.headers.has('content-type')).toBe(false);
  });

  it('should support download progress', async () => {
    await xhrAdapter(
      createEasyRequest({
        ...defaults,
        url: 'https://httpbin.org/image',
        onDownloadProgress(e: ProgressEvent) {
          progress.value = Math.round(e.loaded / e.total) * 100;
        },
        onLoad() {
          expect(progress.value).toBe(100);
        },
        headers: SefarisHeaders.from({ accept: 'image/webp' }),
      })
    );

    expect.assertions(1);
  });

  it('should support upload progress', async () => {
    await xhrAdapter(
      createEasyRequest({
        ...defaults,
        url: 'https://httpbin.org/post',
        method: HttpMethod.POST,
        body: new File([new Blob(Array(500).fill('foo'))], 'foo', { type: 'text/plain' }),
        onUploadProgress(this: XMLHttpRequest) {
          //ProgressEvent.prototype.lengthComputable is always false. It doesn't happen outside of test.
          progress.value = 100;
        },
        onLoad() {
          expect(progress.value).toBe(100);
        },
      })
    );

    expect.assertions(1);
  });

  it('should throw SefarisError of type TIMEOUT_ERROR on timeout', async () => {
    try {
      await xhrAdapter(
        createEasyRequest({
          ...defaults,
          url: 'https://httpbin.org/get',
          timeout: 1,
        })
      );

      return fail();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      expect(e.type).toBe(SefarisError.TIMEOUT);
    }

    try {
      await xhrAdapter(
        createEasyRequest({
          ...defaults,
          url: 'https://httpbin.org/get',
          timeout: '0.001s',
        })
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      expect(e.type).toBe(SefarisError.TIMEOUT);
    }

    expect.assertions(2);
    return;
  });

  it('should throw SefarisError of type BAD_CONFIG_ERROR when provided config is invalid', async () => {
    try {
      await xhrAdapter(
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

  it('should support upload listeners', async () => {
    const config: RequestOptions<unknown> = {
      ...defaults,
      url: 'https://httpbin.org/post',
      method: HttpMethod.POST,
      body: JSON.stringify({}),
      upload: {
        onLoad() {
          expect(this.readyState).toBe(this.HEADERS_RECEIVED);
        },
        onLoadStart() {
          expect(this.readyState).toBe(this.OPENED);
        },
        onLoadEnd() {
          expect(this.readyState).toBe(this.HEADERS_RECEIVED);
        },
      },
    };

    await xhrAdapter(createEasyRequest(config));

    expect.assertions(3);
  });

  it('should support aborting a request with AbortController', async () => {
    const abortController = new AbortController();

    try {
      await xhrAdapter(
        createEasyRequest({
          ...defaults,
          url: 'https://httpbin.org/get',
          abortController,
          onLoadStart() {
            abortController.abort('reason');
          },
          state: {
            unsent(this: XMLHttpRequest) {
              expect(this.readyState).toBe(this.UNSENT);
              expect(this.status).toBe(0);
            },
          },
        })
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      expect(e.type).toBe(SefarisError.CANCEL);
      expect(e.cause).toBe('reason');

      return;
    }

    expect.assertions(4);
  });
});
