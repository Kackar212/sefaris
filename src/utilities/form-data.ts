import { FormSerializer } from '@sefaris/shared';
import { DOM } from './dom';
import {
  createFromEntries,
  isArrayBuffer,
  isArrayBufferView,
  isBlob,
  isDate,
  isIterable,
  isPlainObject,
  isURLSearchParams,
  isVisitable,
} from './object';
import { isArrayFlat } from './array';

export function isForm(form: unknown): form is HTMLFormElement {
  return DOM.isNode(form) && form instanceof HTMLFormElement && form.nodeName === 'FORM';
}

export function isFormData(data: unknown): data is FormData {
  return toString.call(data) === '[object FormData]' && data instanceof FormData;
}

export function formDataToJSON(formData: FormData | URLSearchParams): string {
  return JSON.stringify(formDataToPlain(formData));
}

function formDataToPlain(formData: FormData | URLSearchParams) {
  const entries = formData.entries();

  return createFromEntries(entries);
}

export function createKeyFromPath(path: string[], key: string | number, dots: boolean) {
  return path
    .concat(key.toString())
    .map((key, index) => {
      if (!index || dots) {
        return key;
      }

      return `[${key}]`;
    })
    .join(dots ? '.' : '');
}

export function convertValue(value: unknown): string | Blob {
  if (value === null) return '';

  if (isDate(value)) {
    return value.toISOString();
  }

  if (isBlob(value) || isArrayBuffer(value) || isArrayBufferView(value)) {
    return new Blob([value]);
  }

  return String(value);
}

export const defaultFormSerializer: FormSerializer = {
  visitor(this: FormSerializer, item: unknown, key: string, path: string[], formData: FormData | URLSearchParams) {
    const hasSquareBrackets = key.endsWith('[]');
    if (hasSquareBrackets) {
      key = key.substring(0, key.length - 2);
    }

    const { dots, indexes } = this;
    const metaTokens = [...this.metaTokens, ...defaultFormSerializer.metaTokens];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { token, handle, stripToken = this.stripToken } = metaTokens.find(({ token }) => key.endsWith(token)) || {};
    if (token && handle) {
      if (stripToken) {
        key = key.substring(0, key.length - token.length);
      }

      item = handle(item);
    }

    function setValue(item: unknown, key: string) {
      const convertedValue = convertValue(item);
      if (isURLSearchParams(formData)) {
        formData.append(key, String(convertedValue));

        return false;
      }

      formData.append(key, convertedValue);

      return false;
    }

    if (isIterable(item)) {
      const itemAsArray = Array.from(item);

      if (!isArrayFlat(itemAsArray)) return true;

      itemAsArray.forEach((value, index) => {
        let arrayKey = createKeyFromPath([...path, key], index, dots);

        if (indexes === false) {
          arrayKey = createKeyFromPath(path, '', dots) + `${key}[]`;
        }

        if (indexes === null) {
          arrayKey = createKeyFromPath(path, key, dots);
        }

        setValue(value, arrayKey);
      });

      return false;
    }

    key = createKeyFromPath(path, key, dots);

    if (isVisitable(item)) return true;

    if (hasSquareBrackets) {
      setValue(item, `${key}[0]`);

      return false;
    }

    return setValue(item, key);
  },
  dots: false,
  indexes: true,
  metaTokens: [{ token: '{}', handle: JSON.stringify }],
  stripToken: false,
};

export function toFormData(
  data: Record<string, unknown> | [string, unknown][] | Iterable<[string, unknown]>,
  formSerializer?: Partial<FormSerializer>,
  _FormData?: new () => URLSearchParams
): URLSearchParams;
export function toFormData(
  data: Record<string, unknown> | [string, unknown][] | Iterable<[string, unknown]>,
  formSerializer?: Partial<FormSerializer>,
  _FormData?: new () => FormData
): FormData;
export function toFormData(
  data: Record<string, unknown> | [string, unknown][] | Iterable<[string, unknown]>,
  formSerializer: Partial<FormSerializer> = defaultFormSerializer,
  _FormData: new () => FormData | URLSearchParams = FormData
): URLSearchParams | FormData {
  const formData: FormData | URLSearchParams = new _FormData();
  const serializer: FormSerializer = {
    ...defaultFormSerializer,
    ...formSerializer,
  };

  if (isIterable(data)) {
    try {
      data = Object.fromEntries(data);
    } catch {
      return formData;
    }
  }

  if (!isPlainObject(data)) return formData;

  const stack: Array<Iterable<unknown> | Record<string, unknown>> = [];

  function createFormData(from: Record<string, unknown> | Iterable<unknown>, path: string[] = []) {
    if (stack.includes(from)) {
      throw Error('Circular reference detected at ' + path.join('.'));
    }

    stack.push(from);

    if (isIterable(from)) {
      from = Array.from(from);
    }

    const entries = Object.entries(from);
    for (const [key, value] of entries) {
      const keyAsString = String(key);
      const result = serializer.visitor(value, keyAsString, path, formData);

      if (result) {
        const obj = typeof result === 'boolean' ? value : result;

        createFormData(obj, path.concat(keyAsString.replace('[]', '')));
      }
    }

    return formData;
  }

  return createFormData(data);
}
