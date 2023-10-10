export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumeric(value: unknown) {
  return !isNaN(value as number);
}

// eslint-disable-next-line no-control-regex
const asciiWordExpression = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;

export function isCamelCase(str: string) {
  if (!/[a-z]/.test(str[0])) return false;

  return /^([a-z0-9]+)(([A-Z0-9]?([a-z0-9]*))+)$/.test(str);
}

export function getAsciiWords(str: string): Array<string> {
  return str.match(asciiWordExpression) || [];
}

export function normalizeHeader(headerName: string) {
  return getAsciiWords(headerName).reduce((result: string, word: string, index: number) => {
    if (isCamelCase(word) && /[A-Z]/g.test(word)) {
      return (result += word.replace(/[A-Z]/g, (match) => `-${match}`.toLowerCase()));
    }

    return (result += index === 0 ? word.toLowerCase() : `-${word.toLowerCase()}`);
  }, '');
}
