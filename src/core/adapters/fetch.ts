import { HttpMethod, Time } from '@sefaris/shared';
import { getAuthHeader, TimeParser, isFormData, isPlainObject, isURLSearchParams } from '@sefaris/utilities';
import { EasyRequest, EasyResponse, SefarisError } from '@sefaris/core';

const { setTimeout } = window;

export async function fetchAdapter<T>(easyRequest: EasyRequest<T>) {
  const { config } = easyRequest;
  const { responseBodyType, body, method = HttpMethod.GET } = config;

  const requestBody = easyRequest.transformBody(body);

  if (isFormData(requestBody) || isURLSearchParams(requestBody)) {
    easyRequest.headers.delete('content-type');
  }

  config.abortController = config.abortController || new AbortController();

  const { abortController } = config;
  const signal = abortController.signal;

  let timeoutId: number;
  function requestTimeout(delay: Time | number) {
    try {
      delay = TimeParser.getMiliseconds(delay);

      timeoutId = setTimeout(() => {
        easyRequest.hasTimedOut = true;

        abortController.abort('Request timed out');
      }, delay);
    } catch (e) {
      if (e instanceof Error) {
        throw new SefarisError(e.message, SefarisError.BAD_CONFIG, { request: easyRequest });
      }
    }
  }

  if (isPlainObject(config.auth)) {
    const { type, value } = config.auth;

    easyRequest.headers.set('Authorization', getAuthHeader(type, value));
  }

  const request = new Request(easyRequest.url.toString(), {
    ...config,
    method: config.method?.toUpperCase(),
    body: requestBody,
    signal,
    headers: easyRequest.headers.all({ method }),
    credentials: config.withCredentials && 'include',
  } as RequestInit);

  easyRequest.native = request;

  function clearRequestTimeout() {
    clearTimeout(timeoutId);
  }

  if (config.timeout) {
    requestTimeout(config.timeout);
  }

  try {
    const response = await fetch(request);

    clearRequestTimeout();

    return await EasyResponse.create<T>(easyRequest, response, responseBodyType);
  } catch (e) {
    if (e instanceof DOMException) {
      if (e.name === 'AbortError') {
        const signal = config.abortController?.signal;
        const isManual = signal?.aborted;

        let type = SefarisError.ABORT;

        if (isManual) {
          type = SefarisError.CANCEL;
        }

        if (easyRequest.hasTimedOut) {
          type = SefarisError.TIMEOUT;
        }

        throw new SefarisError(signal.reason || e.message, type, {
          request: easyRequest,
          native: e,
          cause: signal?.reason,
          config,
        });
      }
    }

    throw e;
  }
}
