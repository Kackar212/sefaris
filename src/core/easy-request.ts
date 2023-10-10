import { RequestURL, sefarisBodyInit } from '@sefaris/shared';
import {
  RequestOptions,
  SefarisHeaders,
  sefarisOptions,
  TransformRequestBody,
  validator,
  xhrOptionsSchema,
} from '@sefaris/core';
import { isNil, isArray, buildURL } from '@sefaris/utilities';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class EasyRequest<DataSchema = any> {
  public config: RequestOptions<DataSchema>;
  public url: RequestURL;
  public hasTimedOut = false;
  public native?: unknown;
  public headers: SefarisHeaders;

  constructor(requestOptions: RequestOptions<DataSchema>) {
    this.config = {
      ...requestOptions,
    };

    validator.validate(xhrOptionsSchema, this.config);

    this.headers = requestOptions.headers;
    this.url = buildURL(requestOptions.url, this.config);
  }

  option(key: keyof RequestOptions<DataSchema>): RequestOptions<DataSchema>[keyof RequestOptions<DataSchema>] {
    return key && this.config[key];
  }

  getConfig<T>() {
    return this.config as T;
  }

  getHeaders() {
    return this.headers.clone();
  }

  transformBody(requestBody?: sefarisBodyInit) {
    const { config } = this;

    if (!config.transformRequestBody || isNil(requestBody)) return requestBody;

    if (!isArray(config.transformRequestBody)) {
      config.transformRequestBody = [config.transformRequestBody];
    }

    const transformedBody = config.transformRequestBody.reduce<sefarisBodyInit | undefined>(
      (prevBody: sefarisBodyInit | undefined, transform: TransformRequestBody) => {
        const transformedBody = transform.call(this, prevBody, this.headers);

        return transformedBody as sefarisBodyInit | undefined;
      },
      requestBody
    );

    return transformedBody;
  }

  options(requestOptions: sefarisOptions<DataSchema, SefarisHeaders>) {
    if (requestOptions.headers) {
      this.headers.set(requestOptions.headers);
    }

    this.config = {
      ...this.config,
      ...requestOptions,
      headers: this.headers,
    };

    if (requestOptions.url) {
      this.url = buildURL(requestOptions.url, this.config);
    }

    return this;
  }
}

export function createEasyRequest<T>(options: RequestOptions<T>): EasyRequest<T> {
  return new EasyRequest<T>(options);
}
