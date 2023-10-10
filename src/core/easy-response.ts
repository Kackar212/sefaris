import { EasyRequest, SefarisHeaders, RequestOptions, SefarisError } from '@sefaris/core';
import { mimeSubTypes, mimeTypes, DataType, RESPONSE_DEFAULT_CONTENT_TYPE } from '@sefaris/shared';
import { isInRange, isPlainObject, isArray, isString, getMimeType, getResponseBodyType, DOM } from '@sefaris/utilities';

type DefaultBodyTypes = string | Blob | ArrayBuffer | Record<string, unknown>;
type TransformResultFunction<DataSchema, NewDataSchema> = (result: DataSchema) => NewDataSchema;
type ResponseIterator<T> = IterableIterator<
  T extends string ? string : T extends Array<infer U> ? U : T extends Record<infer K, infer V> ? [K, V] : never
>;

export class EasyResponse<DataSchema = DefaultBodyTypes> {
  public readonly request: EasyRequest<DataSchema>;
  public readonly native: Response;
  public result: DataSchema;
  public readonly headers: SefarisHeaders;
  readonly #status: number;
  readonly #statusText: string;
  public readonly responseBodyType: DataType;
  public readonly mimeType: string;
  public document?: Document;
  static mimeTypes: Record<string, DataType> = mimeTypes;
  static mimeSubTypes: Record<string, DataType> = mimeSubTypes;
  isBodyEmpty?: boolean;
  config: RequestOptions<DataSchema>;

  constructor(request: EasyRequest<DataSchema>, response: Response, responseBodyType?: DataType) {
    this.request = request;
    this.native = response;
    this.headers = this.#createHeaders(this.#getHeaders());
    this.#status = this.native.status;
    this.#statusText = this.native.statusText;
    this.config = this.request.config;
    this.mimeType = this.config.mimeType || this.getMimeType();
    this.responseBodyType = responseBodyType || this.getResponseBodyType();
    const contentLength = this.headers.get('content-length');
    this.isBodyEmpty = contentLength ? Number(contentLength) === 0 : undefined;
    this.result = this.config.defaultResult as DataSchema;
  }

  static extendMimeTypes(newMimeTypes: { [key: string]: DataType }) {
    this.mimeTypes = {
      ...this.mimeTypes,
      ...newMimeTypes,
    };
  }

  static extendMimeSubTypes(newSubTypes: { [key: string]: DataType }) {
    this.mimeSubTypes = {
      ...this.mimeSubTypes,
      ...newSubTypes,
    };
  }

  [Symbol.iterator](): ResponseIterator<DataSchema> {
    if (isArray(this.result)) {
      return this.result.values() as ResponseIterator<DataSchema>;
    }

    if (isPlainObject(this.result)) {
      const entries = Object.entries(this.result);
      return entries.values() as ResponseIterator<DataSchema>;
    }

    if (isString(this.result)) {
      return Array.from(this.result).values() as ResponseIterator<DataSchema>;
    }

    return [].values();
  }

  get status() {
    return this.#status;
  }

  get statusText() {
    return this.#statusText;
  }

  #validate() {
    const { config } = this;
    const { status, statusText } = this;

    if (status && config.validateStatus && !config.validateStatus(status)) {
      const error: { type: string; message: string } = {
        type: SefarisError.BAD_RESPONSE,
        message: `Response ${status} ${statusText}`,
      };

      if (isInRange(status, [399, 499])) {
        error.type = SefarisError.CLIENT;
        error.message = `Bad request - ${status} ${statusText}`;
      } else if (status > 499) {
        error.type = SefarisError.SERVER;
        error.message = `Server error - ${status} ${statusText}`;
      }

      throw new SefarisError<DataSchema>(error.message, error.type, {
        request: this.request,
        response: this,
      });
    }
  }

  #createHeaders(headers: Record<string, string>): SefarisHeaders {
    return new SefarisHeaders(headers);
  }

  #getHeaders() {
    const {
      native: { headers },
    } = this;
    const headersAsEntries = headers.entries();

    return Object.fromEntries(headersAsEntries);
  }

  #setResult(result: DataSchema): void {
    this.result = result;
  }

  async #hasEmptyBody(response: Response) {
    const resolveBody = await response.clone().text();

    return resolveBody === '';
  }

  async getResolvedBody(): Promise<DataSchema | DefaultBodyTypes> {
    const {
      request: {
        config: { tryResolveBodyTo, cloneResponseBody },
      },
    } = this;

    if (tryResolveBodyTo) {
      try {
        return await this.resolveBody<DataSchema>(tryResolveBodyTo, cloneResponseBody);
        // eslint-disable-next-line no-empty
      } catch {}
    }

    return await this.resolveBody<DataSchema>(this.responseBodyType, cloneResponseBody);
  }

  async #init(): Promise<EasyResponse<DataSchema>> {
    if (this.config.resolveResponse) {
      const result = await this.getResolvedBody();

      this.#setResult(result as DataSchema);
    }

    if (DOM.isSupportedType(this.mimeType) && isString(this.result)) {
      this.document = DOM.parse(this.result, this.mimeType);
    }

    return this;
  }

  async resolveBody<T = DataSchema>(dataType: DataType, clone = true): Promise<T | DefaultBodyTypes> {
    const response = clone ? this.native.clone() : this.native;

    this.isBodyEmpty = await this.#hasEmptyBody(response);

    if (this.isBodyEmpty) {
      return this.config.defaultResult as T;
    }

    try {
      switch (dataType) {
        case DataType.TEXT: {
          return await response.text();
        }

        case DataType.JSON: {
          return await response.json();
        }

        case DataType.BLOB: {
          return await response.blob();
        }

        case DataType.ARRAY_BUFFER: {
          return await response.arrayBuffer();
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      throw new SefarisError(e.message, SefarisError.BAD_RESPONSE, { native: e, response: this, request: this.request });
    }
  }

  async transformResult<T, NewType = unknown>(callback: TransformResultFunction<T, NewType>) {
    const result = await callback(this.result as unknown as T);
    const self = this as unknown as EasyResponse<NewType>;

    self.result = result;
    return self;
  }

  getResponseBodyType(mimeType: string = this.mimeType): DataType {
    const { mimeTypes, mimeSubTypes } = EasyResponse;

    return getResponseBodyType(mimeType, { ...mimeTypes, ...mimeSubTypes });
  }

  getMimeType(contentType: string = RESPONSE_DEFAULT_CONTENT_TYPE): string {
    contentType = this.headers.get('content-type') || contentType;

    return getMimeType(contentType) || contentType;
  }

  header(headerName: string): string | string[] | undefined {
    return this.headers.get(headerName);
  }

  static async create<DataSchema>(
    request: EasyRequest<DataSchema>,
    response: Response,
    responseBodyType?: DataType
  ): Promise<EasyResponse<DataSchema>> {
    const easyResponse = new EasyResponse<DataSchema>(request, response, responseBodyType);

    await easyResponse.#init();
    easyResponse.#validate();

    return easyResponse;
  }
}
