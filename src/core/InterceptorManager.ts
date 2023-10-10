import { RequestOptions, SefarisError } from '@sefaris/core';

export type onResolved<T, R> = (config: T) => R;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type onRejected = (error: SefarisError<any>) => any;

interface InterceptorOptions {
  callWhen?: <T>(config: RequestOptions<T>) => boolean;
  sync?: boolean;
}

export interface Interceptor<T, R> extends InterceptorOptions {
  onRejected?: onRejected;
  onResolved: onResolved<T, R>;
  id: number;
}

export class InterceptorManager<R> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #handlers: Interceptor<any, R>[] = [];

  [Symbol.iterator]() {
    return this.#handlers.values();
  }

  get<T>(config: RequestOptions<T>): Interceptor<unknown, R>[] {
    return this.#handlers.filter(({ callWhen }) => {
      if (callWhen) {
        return callWhen(config);
      }

      return true;
    });
  }

  use<T>(onResolved: onResolved<T, R>, onRejected?: onRejected, options: InterceptorOptions = {}) {
    const id = this.#handlers.length;
    this.#handlers.push(
      Object.assign(
        { sync: false },
        {
          onResolved,
          onRejected,
          ...options,
          id,
        }
      )
    );

    return id;
  }

  eject(id: number) {
    this.#handlers = this.#handlers.filter((interceptor) => interceptor.id !== id);
  }

  clear() {
    this.#handlers = [];
  }
}
