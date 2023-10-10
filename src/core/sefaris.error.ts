import { EasyRequest, EasyResponse, sefarisOptions } from '@sefaris/core';

interface SefarisErrorOptions<DataSchema> {
  native?: Error | ProgressEvent | unknown;
  response?: EasyResponse<DataSchema>;
  request?: EasyRequest<DataSchema>;
  config?: sefarisOptions<DataSchema> | Record<string, unknown>;
  data?: unknown;
  cause?: unknown;
}

export class SefarisError<DataSchema> extends Error {
  static readonly TIMEOUT = 'TIMEOUT_ERROR';
  static readonly CANCEL = 'CANCELATION_ERROR';
  static readonly ABORT = 'ABORT_ERROR';
  static readonly BAD_RESPONSE = 'BAD_RESPONSE_ERROR';
  static readonly BAD_CONFIG = 'BAD_CONFIG_ERROR';
  static readonly NETWORK = 'NETWORK_ERROR';
  static readonly SERVER = 'SERVER_ERROR';
  static readonly CLIENT = 'CLIENT_ERROR';

  message: string;
  type: string;
  native?: SefarisErrorOptions<DataSchema>['native'];
  hasResponse: boolean;
  hasRequest: boolean;
  isSefarisError = true;
  code?: number;
  config?: SefarisErrorOptions<DataSchema>['config'];
  response?: SefarisErrorOptions<DataSchema>['response'];
  request: SefarisErrorOptions<DataSchema>['request'];
  cause: unknown;
  data: unknown;

  constructor(message: string, type: string, options: SefarisErrorOptions<DataSchema> = {}) {
    super(message, { cause: options.cause });

    Error.captureStackTrace(this, this.constructor);

    this.cause = options.cause;
    this.message = message;
    this.type = type;
    this.native = options.native;
    this.response = options.response;
    this.request = options.request;
    this.code = this.response?.status;
    this.name = this.constructor.name;
    this.config = options.config;
    this.data = options.data;

    this.hasResponse = !!this.response;
    this.hasRequest = !!this.request;

    if (this.stack) {
      this.stack = this.stack.replace(`${this.name}: `, '');
    }

    return this;
  }

  static create<DataSchema>(message: string, type: string, options: SefarisErrorOptions<DataSchema>) {
    return new SefarisError<DataSchema>(message, type, options);
  }

  getStatusCode(): number {
    const { response } = this;
    if (!response) return -1;

    return response.status;
  }

  isResponseError(): boolean {
    return !!this.hasResponse;
  }

  getResponse(): EasyResponse<DataSchema> | undefined {
    return this.response;
  }

  getNativeResponse(): Response | undefined {
    return this.getResponse()?.native;
  }

  getRequest(): EasyRequest<DataSchema> | undefined {
    return this.response?.request;
  }

  toPlain() {
    return {
      name: this.type,
      message: this.message,
      stack: this.stack,
      cause: this.cause,
      code: this.code,
    };
  }
}
