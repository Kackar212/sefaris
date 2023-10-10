import { DEFAULT_CONTENT_TYPE, HttpStatus, sefarisBodyInit } from '@sefaris/shared';
import {
  isArray,
  formDataToJSON,
  isFormData,
  isForm,
  toFormData,
  isArrayBuffer,
  isArrayBufferView,
  isBlob,
  isFile,
  isFileList,
  isIterable,
  isPlainObject,
  isStream,
  isURLSearchParams,
  isString,
  isNil,
  defaultFormSerializer,
  DOM,
} from '@sefaris/utilities';
import { SefarisHeaders } from '../headers';
import { fetchAdapter } from '../adapters/fetch';
import { GlobalOptions } from '../options/global-options.interface';

export const defaults: Required<GlobalOptions<SefarisHeaders>> = {
  cloneResponseBody: true,
  validateStatus(status: number) {
    return status >= HttpStatus.OK && status < HttpStatus.MULTIPLE_CHOICES;
  },
  timeout: 0,
  defaultResult: '',
  baseURL: location.origin,
  resolveResponse: true,
  adapter: fetchAdapter,
  transformRequestBody: function (body: sefarisBodyInit | undefined, headers: SefarisHeaders): sefarisBodyInit | undefined {
    if (isNil(body)) return null;

    const contentType = headers.get('content-type') || DEFAULT_CONTENT_TYPE;
    const hasJSONContentType = contentType.includes('application/json');

    if (isURLSearchParams(body)) {
      if (hasJSONContentType) {
        return formDataToJSON(body);
      }

      headers.set('content-type', DEFAULT_CONTENT_TYPE);

      return body;
    }

    if (isForm(body)) {
      body = new FormData(body);
    }

    if (isFormData(body)) {
      if (hasJSONContentType) {
        return formDataToJSON(body);
      }

      return body;
    }

    if (DOM.isNode<HTMLInputElement>(body)) {
      const INPUT_FILE_TYPE = 'file';
      if (body.type === INPUT_FILE_TYPE) {
        body = body.files;
      }
    }

    if (DOM.isNode(body)) {
      headers.set('content-type', ['application/xml', 'text/xml']);

      return DOM.serialize(body);
    }

    if (isArrayBufferView(body)) {
      return body.buffer;
    }

    if (isFile(body)) {
      return toFormData({ file: body }, this.formSerializer);
    }

    if (isStream(body) || isBlob(body) || isArrayBuffer(body) || isString(body)) {
      return body;
    }

    if (isFileList(body)) {
      return toFormData({ 'files[]': [...body] }, this.formSerializer);
    }

    if (isPlainObject<Record<string, unknown>>(body) || contentType.includes('multipart/form-data') || isIterable(body)) {
      if (!body) return null;

      const newBody = isIterable(body) ? [...body] : body;

      if (hasJSONContentType) {
        if (isArray<[string, unknown]>(newBody)) {
          return JSON.stringify(Object.fromEntries(newBody));
        }

        return JSON.stringify(newBody);
      }

      if (contentType.includes(DEFAULT_CONTENT_TYPE.split(';')[0])) {
        return toFormData(newBody, this.formSerializer, URLSearchParams);
      }

      return toFormData(newBody, this.formSerializer);
    }

    return body;
  },
  headers: new SefarisHeaders(),
  auth: true,
  withCredentials: true,
  formSerializer: defaultFormSerializer,
  tryResolveBodyTo: null,
  xsrf: {
    cookie: 'XSRF-TOKEN',
    header: 'X-XSRF-TOKEN',
  },
};
