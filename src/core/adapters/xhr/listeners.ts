import { XhrAbortController } from '.';
import { EasyRequest, EasyResponse, RequestOptions, SefarisError, SefarisHeaders, XhrOptions } from '@sefaris/core';

function addOnReadyStateChange<T>(xhr: XMLHttpRequest, { state }: XhrOptions<T>) {
  xhr.onreadystatechange = function onReadyStateChange() {
    switch (this.readyState) {
      case this.OPENED: {
        state?.opened?.call(this);
        break;
      }
      case this.LOADING: {
        state?.loading?.call(this);
        break;
      }
      case this.HEADERS_RECEIVED: {
        state?.headersReceived?.call(this);
        break;
      }
      case this.DONE: {
        state?.done?.call(this);
        break;
      }
    }
  };
}

interface CreateListenersParameters<T> {
  resolve: (value: EasyResponse<T> | PromiseLike<EasyResponse<T>>) => void;
  reject: (reason?: unknown) => void;
  request: EasyRequest<T>;
  xhrAbortController: XhrAbortController;
}

export function createListeners<T>({ reject, resolve, request, xhrAbortController }: CreateListenersParameters<T>) {
  function onLoadStart() {
    xhrAbortController.canAbort = true;
    xhrAbortController.isAborted = false;

    if (config.onLoadStart) {
      config.onLoadStart();
    }
  }

  const config = request.getConfig<RequestOptions<T>>();

  async function onLoad(this: XMLHttpRequest) {
    const response = new Response(this.response, {
      headers: SefarisHeaders.from(this.getAllResponseHeaders()).native(),
      status: this.status,
      statusText: this.statusText,
    });

    try {
      const easyResponse = await EasyResponse.create<T>(request, response, config.responseBodyType);

      if (config.onLoad) {
        config.onLoad(easyResponse);
      }

      resolve(easyResponse);
    } catch (e) {
      reject(e);
    }
  }

  function onAbort(e: ProgressEvent) {
    if (xhrAbortController.isAborted) {
      reject(
        new SefarisError('Request canceled', SefarisError.CANCEL, {
          request,
          native: e,
          cause: xhrAbortController.reason,
        })
      );
    }

    reject(new SefarisError('Request aborted', SefarisError.ABORT, { request, native: e }));
  }

  function onError(e: ProgressEvent) {
    reject(new SefarisError('Network error', SefarisError.NETWORK, { request, native: e }));
  }

  function onTimeout(e: ProgressEvent) {
    request.hasTimedOut = true;

    reject(
      new SefarisError('Timeout error', SefarisError.TIMEOUT, {
        request,
        native: e,
      })
    );
  }

  return { onLoadStart, onLoad, onAbort, onError, onTimeout };
}

interface AttachListenersParameters<T> {
  xhrInstance: XMLHttpRequest;
  config: XhrOptions<T>;
  listeners: ReturnType<typeof createListeners<T>>;
}

export function attachListeners<T>({ xhrInstance, config, listeners }: AttachListenersParameters<T>) {
  addOnReadyStateChange(xhrInstance, config);

  const { onLoadStart, onLoad, onAbort, onError, onTimeout } = listeners;

  xhrInstance.onabort = onAbort;
  xhrInstance.ontimeout = onTimeout;
  xhrInstance.onprogress = config.onDownloadProgress?.bind(xhrInstance) || null;
  xhrInstance.onerror = onError;
  xhrInstance.onload = onLoad;
  xhrInstance.onloadstart = onLoadStart;
  xhrInstance.onloadend = config.onLoadEnd?.bind(xhrInstance) || null;

  const { upload } = config;

  if (upload) {
    xhrInstance.upload.onloadstart = upload.onLoadStart?.bind(xhrInstance) || null;
    xhrInstance.upload.onload = upload.onLoad?.bind(xhrInstance) || null;
    xhrInstance.upload.onloadend = upload.onLoadEnd?.bind(xhrInstance) || null;
  }

  if (config.onUploadProgress) {
    xhrInstance.upload.addEventListener('progress', config.onUploadProgress.bind(xhrInstance));
  }

  xhrInstance.upload.ontimeout = onTimeout;
  xhrInstance.upload.onerror = onError;
  xhrInstance.upload.onabort = onAbort;
}
