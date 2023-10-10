import { HttpMethod } from '@sefaris/shared';
import { getAuthHeader, TimeParser, isPlainObject, isFormData, isURLSearchParams } from '@sefaris/utilities';
import { attachListeners, createListeners } from './listeners';
import { SefarisError, EasyResponse, EasyRequest, validator, xhrOptionsSchema } from '@sefaris/core';

export interface XhrAbortController {
  reason?: unknown;
  canAbort: boolean;
  isAborted: boolean;
  abort(reason?: unknown): void;
}

function createInstance<T>({ config: { state } }: EasyRequest<T>): XMLHttpRequest {
  const xhrInstance = new XMLHttpRequest();
  xhrInstance.responseType = 'arraybuffer';

  if (state?.unsent) {
    state.unsent.call(xhrInstance);
  }

  return xhrInstance;
}

export function xhrAdapter<T>(request: EasyRequest<T>): Promise<EasyResponse<T>> {
  return new Promise((resolve, reject) => {
    const { config } = request;

    validator.validate(xhrOptionsSchema, config);

    const headers = request.getHeaders();
    const { timeout, method = HttpMethod.GET } = config;

    const xhrInstance = createInstance<T>(request);
    request.native = xhrInstance;

    const xhrAbortController: XhrAbortController = {
      canAbort: false,
      isAborted: false,
      abort(reason?: unknown) {
        if (!this.canAbort) return;

        this.canAbort = false;
        this.isAborted = true;
        this.reason = reason;

        xhrInstance.abort();
      },
    };

    if (config.abortController) {
      const {
        abortController: { signal: abortSignal },
      } = config;

      abortSignal.addEventListener('abort', function (this: AbortSignal) {
        xhrAbortController.abort(this.reason);
      });
    }

    if (timeout) {
      try {
        const timeoutAsMiliseconds = TimeParser.getMiliseconds(timeout);

        xhrInstance.timeout = timeoutAsMiliseconds;
      } catch (e) {
        if (e instanceof Error) {
          throw new SefarisError(e.message, SefarisError.BAD_CONFIG, { request });
        }
      }
    }

    const data = request.transformBody(config.body);

    if (isFormData(data) || isURLSearchParams(data)) {
      headers.delete('content-type');
    }

    const listeners = createListeners<T>({ request, resolve, reject, xhrAbortController });
    attachListeners({ xhrInstance, config, listeners });

    xhrInstance.open(method.toUpperCase(), request.url.toString(), true);
    xhrInstance.withCredentials = config.withCredentials;

    const requestHeaders = headers.entries({ method });
    for (const [headerName, headerValue] of requestHeaders) {
      xhrInstance.setRequestHeader(headerName, headerValue.toString());
    }

    if (isPlainObject(config.auth)) {
      const { type, value } = config.auth;

      xhrInstance.setRequestHeader('Authorization', getAuthHeader(type, value));
    }

    xhrInstance.send(data as XMLHttpRequestBodyInit);
  });
}
