import { createEasyRequest, EasyRequest } from './easy-request';
import { EasyResponse } from './easy-response';
import { SefarisHeaders } from './headers';
import { xhrAdapter } from './adapters';
import { optionsSchema, validator, xhrOptionsSchema, defaults } from './config';
import { isFunction, isRequestUrl, isString, isUndefined, kindOf } from '@sefaris/utilities';
import { Interceptor, InterceptorManager, onResolved } from './InterceptorManager';
import { Cookies, CookiesCollection } from './cookies';
import { HttpMethod, Auth, DEFAULT_CONTENT_TYPE, SefarisHeadersInit } from '@sefaris/shared';
import { GlobalOptions, RequestOptions, sefarisOptions } from './options';
import { SefarisError } from './sefaris.error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class Sefaris<DataSchema = any> extends Function {
  public headers: SefarisHeaders;
  public options: Required<GlobalOptions<SefarisHeaders>> = defaults;
  public interceptors = {
    request: new InterceptorManager<EasyRequest<DataSchema>>(),
    response: new InterceptorManager<EasyResponse<DataSchema>>(),
  };
  public cookies: CookiesCollection;
  public xhr!: Sefaris;
  public name = 'sefaris';

  #lastRequest: sefarisOptions<unknown> | null = null;

  constructor(options: GlobalOptions = {}, withXhrAdapter = true) {
    super();

    validator.validate(optionsSchema, options);

    const headers = SefarisHeaders.from({
      'content-type': DEFAULT_CONTENT_TYPE,
    });

    if (options.headers) headers.set(options.headers);

    this.headers = headers;
    this.options = this.#mergeGlobalOptions(options);
    this.cookies = Cookies;

    if (withXhrAdapter) {
      this.xhr = new Sefaris({ ...options, adapter: xhrAdapter }, false);
      this.xhr.xhr = this.xhr;
    }

    return new Proxy(this, {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      apply: (_target, _thisArg, args) => {
        return this.request(args[0]);
      },
      get: (...args) => {
        const value = Reflect.get(...args);

        return isFunction(value) && !this.#isSefaris(value) ? value.bind(this) : value;
      },
    });
  }

  #isSefaris(value: unknown) {
    return kindOf(Sefaris, value);
  }

  #getOptions<T>(urlOrConfig: RequestOptions<T>['url'] | sefarisOptions<T>, options: sefarisOptions<T>) {
    return isRequestUrl(urlOrConfig) ? { ...options, url: urlOrConfig } : urlOrConfig;
  }

  #getRequestOptions<T>(url: sefarisOptions<T>['url'] | sefarisOptions<T>, config: sefarisOptions<T> = {}, method?: string) {
    const {
      options: { auth },
    } = this;

    if (isUndefined(url)) {
      url = '';
    }

    const options = this.#getOptions(url, config);

    if (options.auth === true) {
      options.auth = auth;
    }

    const headers = this.#mergeHeaders(options.headers);
    return this.#mergeOptions<T>(
      { ...this.options, url: options.url || '', headers, method: method ? method : options.method },
      options
    );
  }

  async #request<T, NewType = T>(config: RequestOptions<T>) {
    this.#lastRequest = config as RequestOptions<unknown>;

    if (config.xsrf) {
      const {
        xsrf: { cookie: xsrfCookie, header: xsrfHeader },
      } = config;
      const xsrfCookieValue = this.cookies.get<string>(xsrfCookie);

      if (isString(xsrfCookieValue)) {
        config.headers.set(xsrfHeader, xsrfCookieValue);
      }
    }

    const easyRequest = createEasyRequest(config);

    try {
      const response = await this.#runInterceptors<T>(easyRequest);

      if (config.transformResult) {
        const transformResult = config.transformResult;

        return await response.transformResult<T, NewType>((result: T) => {
          return transformResult(result) as NewType;
        });
      }

      return response;
    } catch (e) {
      if (this.isSefarisError(e)) {
        throw e;
      }

      if (e instanceof TypeError) {
        throw new SefarisError(e.message, SefarisError.BAD_CONFIG, {
          native: e,
          config,
          request: easyRequest,
        });
      }

      throw new SefarisError('Network error', SefarisError.NETWORK, {
        request: easyRequest,
        config,
        native: e,
      });
    }
  }

  #httpMethodFunction<T, NewType>(
    url?: sefarisOptions['url'] | sefarisOptions<T>,
    config?: sefarisOptions<T>,
    method?: string
  ): Promise<EasyResponse<T> | EasyResponse<NewType>> {
    const shouldValidateConfig = (!isUndefined(config) && isRequestUrl(url)) || (!isRequestUrl(url) && !isUndefined(url));
    if (shouldValidateConfig) {
      validator.validate(xhrOptionsSchema, isRequestUrl(url) ? config : url);
    }

    const options = this.#getRequestOptions<T>(url, config, method);

    return this.#request<T, NewType>(options);
  }

  #mergeHeaders(headers?: SefarisHeadersInit | SefarisHeaders) {
    const sefarisHeaders = this.headers.clone();

    return sefarisHeaders.set(headers);
  }

  #mergeGlobalOptions(options: GlobalOptions) {
    return Object.assign({}, this.options, options, { headers: this.headers });
  }

  #mergeOptions<T>(requestOptions: RequestOptions<T>, options: sefarisOptions<T>): RequestOptions<T> {
    const mergedOptions = Object.assign({}, requestOptions, options);

    if (mergedOptions.auth === true) {
      mergedOptions.auth = this.options.auth;
    }

    return mergedOptions;
  }

  async #runInterceptors<T>(easyRequest: EasyRequest): Promise<EasyResponse<T>> {
    const { config } = easyRequest;
    const adapter = config.adapter || this.options.adapter;

    if (!adapter || typeof adapter !== 'function') {
      throw new SefarisError('Adapter must be a function', SefarisError.BAD_CONFIG, {
        request: easyRequest,
        data: { adapter },
      });
    }

    const adapterOnResolved = {
      onResolved: adapter as onResolved<EasyRequest<T>, Promise<EasyResponse<T>>>,
    } as Interceptor<EasyRequest<T>, Promise<EasyResponse<T>>>;
    const { interceptors } = this;
    const requestInterceptors = interceptors.request.get<T>(config);
    const responseInterceptors = interceptors.response.get<T>(config);
    const chain = [...requestInterceptors, adapterOnResolved, ...responseInterceptors];

    const isEachInterceptorSynchronous = chain.some(({ sync }) => !sync);

    function peek<T>(
      interceptors: Interceptor<unknown, T>[]
    ): Pick<Required<Interceptor<unknown, T>>, 'onResolved' | 'onRejected'> {
      const item = interceptors.shift();

      if (!item) return { onResolved: () => null as T, onRejected: () => null };

      const { onResolved, onRejected = () => undefined } = item;

      return { onResolved, onRejected };
    }

    function reduce<T>(
      interceptors: Interceptor<unknown, T>[],
      reducer: (result: T, interceptor: Partial<Interceptor<unknown, T>>) => T,
      initialValue: T
    ): T {
      while (interceptors.length) {
        try {
          initialValue = reducer(initialValue, peek<T>(interceptors));
        } catch {
          continue;
        }
      }

      return initialValue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function asyncRun<T>(interceptors: Interceptor<any, any>[], value: any): Promise<T> {
      return reduce<Promise<T>>(
        interceptors,
        async (result: Promise<T>, { onResolved, onRejected }) => {
          try {
            return await result.then(onResolved);
          } catch (e) {
            const error = new SefarisError('Interceptor error', SefarisError.BAD_CONFIG, { config, native: e });

            if (onRejected) onRejected(error);

            return await result;
          }
        },
        Promise.resolve(value)
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function syncRun<T>(interceptors: Interceptor<any, any>[], value: any): T {
      return reduce<T>(
        interceptors,
        (result: T, { onResolved, onRejected }) => {
          const error = new SefarisError('Interceptor error', SefarisError.BAD_CONFIG, { config });
          if (!onResolved) throw error;

          try {
            return onResolved(result);
          } catch (e) {
            error.native = e;

            if (onRejected) onRejected(error);
            return result;
          }
        },
        value
      );
    }

    if (!isEachInterceptorSynchronous) {
      return await asyncRun<EasyResponse<T>>(chain, easyRequest);
    }

    const newEasyRequest = syncRun<EasyRequest>(requestInterceptors, easyRequest);
    const easyResponse = await adapter<T>(newEasyRequest);
    return await asyncRun<EasyResponse<T>>(responseInterceptors, easyResponse);
  }

  public isSefarisError<T>(v: unknown): v is SefarisError<T> {
    return kindOf(SefarisError, v);
  }

  public auth(type: Auth, value: string | string[]) {
    if (type === Auth.BASIC && isString(value) && value.includes(':')) {
      value = value.split(':');
    }

    this.options.auth = {
      type,
      value: isString(value) ? [value] : value,
    };
  }

  public config(options: GlobalOptions) {
    validator.validate(optionsSchema, options);

    if (options.headers) {
      this.headers.set(options.headers);
    }

    this.options = this.#mergeGlobalOptions(options);
  }

  public restoreDefaults(options: GlobalOptions = defaults) {
    this.headers = SefarisHeaders.from(options.headers);
    this.options = Object.assign({}, defaults, options, { headers: this.headers });
  }

  request<T, NewType = T>(this: Sefaris<T>, options: sefarisOptions<T>): Promise<EasyResponse<NewType>> {
    return this.#httpMethodFunction<T, NewType>(options, undefined, options?.method || HttpMethod.GET) as Promise<
      EasyResponse<NewType>
    >;
  }

  retry<T = unknown, NewType = T>() {
    if (!this.#lastRequest) {
      throw new SefarisError("You can't retry request when there wasn't one!", SefarisError.BAD_CONFIG);
    }

    return this.#request<T, NewType>(this.#lastRequest as RequestOptions<T>);
  }

  get<T = unknown, NewType = T>(this: Sefaris<T>): Promise<EasyResponse<NewType>>;
  get<T = unknown, NewType = T>(
    this: Sefaris<NewType>,
    url: string,
    config?: sefarisOptions<T>
  ): Promise<EasyResponse<NewType>>;
  get<T = unknown, NewType = T>(this: Sefaris<NewType>, config: sefarisOptions<T>): Promise<EasyResponse<NewType>>;
  get<T = unknown, NewType = T>(
    this: Sefaris<NewType>,
    urlOrConfig?: string | sefarisOptions<T>,
    config?: sefarisOptions<T>
  ): Promise<EasyResponse<NewType>> {
    return this.#httpMethodFunction<T, NewType>(urlOrConfig, config, HttpMethod.GET) as Promise<EasyResponse<NewType>>;
  }

  post<T = unknown, NewType = T>(this: Sefaris<T>): Promise<EasyResponse<NewType>>;
  post<T = unknown, NewType = T>(
    this: Sefaris<NewType>,
    url: string,
    config?: sefarisOptions<T>
  ): Promise<EasyResponse<NewType>>;
  post<T = unknown, NewType = T>(this: Sefaris<NewType>, config: sefarisOptions<T>): Promise<EasyResponse<NewType>>;
  post<T = unknown, NewType = T>(
    this: Sefaris<NewType>,
    urlOrConfig?: string | sefarisOptions<T>,
    config?: sefarisOptions<T>
  ): Promise<EasyResponse<NewType>> {
    return this.#httpMethodFunction(urlOrConfig, config, HttpMethod.POST) as Promise<EasyResponse<NewType>>;
  }

  put<T = unknown, NewType = T>(this: Sefaris<T>): Promise<EasyResponse<NewType>>;
  put<T = unknown, NewType = T>(
    this: Sefaris<NewType>,
    url: string,
    config?: sefarisOptions<T>
  ): Promise<EasyResponse<NewType>>;
  put<T = unknown, NewType = T>(this: Sefaris<NewType>, config: sefarisOptions<T>): Promise<EasyResponse<NewType>>;
  put<T = unknown, NewType = T>(
    this: Sefaris<NewType>,
    urlOrConfig?: string | sefarisOptions<T>,
    config?: sefarisOptions<T>
  ): Promise<EasyResponse<NewType>> {
    return this.#httpMethodFunction(urlOrConfig, config, HttpMethod.PUT) as Promise<EasyResponse<NewType>>;
  }

  patch<T = unknown, NewType = T>(this: Sefaris<T>): Promise<EasyResponse<NewType>>;
  patch<T = unknown, NewType = T>(
    this: Sefaris<NewType>,
    url: string,
    config?: sefarisOptions<T>
  ): Promise<EasyResponse<NewType>>;
  patch<T = unknown, NewType = T>(this: Sefaris<NewType>, config: sefarisOptions<T>): Promise<EasyResponse<NewType>>;
  patch<T = unknown, NewType = T>(
    this: Sefaris<NewType>,
    urlOrConfig?: string | sefarisOptions<T>,
    config?: sefarisOptions<T>
  ): Promise<EasyResponse<NewType>> {
    return this.#httpMethodFunction(urlOrConfig, config, HttpMethod.PATCH) as Promise<EasyResponse<NewType>>;
  }

  delete<T = unknown, NewType = T>(this: Sefaris<T>): Promise<EasyResponse<NewType>>;
  delete<T = unknown, NewType = T>(
    this: Sefaris<NewType>,
    url: string,
    config?: sefarisOptions<T>
  ): Promise<EasyResponse<NewType>>;
  delete<T = unknown, NewType = T>(this: Sefaris<NewType>, config: sefarisOptions<T>): Promise<EasyResponse<NewType>>;
  delete<T = unknown, NewType = T>(
    this: Sefaris<NewType>,
    urlOrConfig?: string | sefarisOptions<T>,
    config?: sefarisOptions<T>
  ): Promise<EasyResponse<NewType>> {
    return this.#httpMethodFunction(urlOrConfig, config, HttpMethod.DELETE) as Promise<EasyResponse<NewType>>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static create<T = any>(options: GlobalOptions = {}, withXhrAdapter = true) {
    const sefaris = new Sefaris<T>(options, withXhrAdapter);

    return sefaris;
  }

  create<T = DataSchema>(options: GlobalOptions = {}, withXhrAdapter = true): Sefaris {
    return Sefaris.create<T>(options, withXhrAdapter);
  }
}

export const sefaris = Sefaris.create();

export * from './adapters';
export * from './cookies';
export * from './headers';
export * from './easy-response';
export * from './easy-request';
export * from './config';
export * from './InterceptorManager';
export * from './options';
export * from './sefaris.error';
