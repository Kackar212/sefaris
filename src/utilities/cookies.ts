import { CookieOptions } from '@sefaris/core';
import { TimeParser, hasProperty, isDate, isNumber } from '.';

function stringifyAttributes(attributes: CookieOptions) {
  if (TimeParser.isValidTime(attributes.expires)) {
    attributes.expires = TimeParser.getDays(attributes.expires);
  }

  if (isNumber(attributes.expires)) {
    const MILISECONDS_IN_DAY = 86400000;

    attributes.expires = new Date(Date.now() + attributes.expires * MILISECONDS_IN_DAY);
  }

  if (isDate(attributes.expires)) {
    attributes.expires = attributes.expires.toUTCString();
  }

  let stringifiedAttributes = '';

  for (const attributeName in attributes) {
    if (!hasProperty(attributes, attributeName)) continue;

    const attribute = Reflect.get(attributes, attributeName);

    stringifiedAttributes += `${attributeName}=${attribute};`;
  }

  return stringifiedAttributes;
}

function getCookies() {
  const cookies = document.cookie.split(';').filter(Boolean);

  return cookies
    .map((cookie) => cookie.split('='))
    .map(([name, ...value]) => [name.trim(), value.join('=')])
    .reduce<Record<string, string>>((parsedCookies, [cookieName, cookieValue]) => {
      parsedCookies[decodeName(cookieName)] = decodeValue(cookieValue);

      return parsedCookies;
    }, {});
}

function encodeName(name: string) {
  return encodeURIComponent(name).replace(/[(]/g, '%28').replace(/[)]/g, '%29');
}

function decodeName(name: string) {
  return decodeURIComponent(name).replace(/%28/g, '(').replace(/%29/g, ')');
}

function encodeValue(value: string) {
  return encodeURIComponent(value);
}

function decodeValue(value: string) {
  return decodeURIComponent(value);
}

export { getCookies, stringifyAttributes, encodeName, encodeValue, decodeName, decodeValue };
