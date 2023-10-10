import { Query, RequestURL, sefarisURLOptions, URLParameters } from '@sefaris/shared';
import { defaultFormSerializer, toFormData } from '../form-data';
import { getFromPath, isURL, isURLSearchParams } from '../object';
import { isString } from '../string';
import { URLResult } from './url-result';

function build(rawUrl: RequestURL, options: sefarisURLOptions = {}) {
  const { query = {}, parameters = {}, baseURL } = options;
  const base = baseURL ? new URL(baseURL.toString()) : new URL(location.origin);
  const { pathname } = base;
  const urlWithoutParameters = replaceParameters(parameters, String(rawUrl));

  if (!pathname.endsWith('/')) {
    base.pathname += '/';
  }

  const url: URL = createURL(urlWithoutParameters, base);

  const parsedQuery = isURLSearchParams(query) ? query : parseQuery(query);
  const mergedQuery = mergeQuery(url, parsedQuery);

  url.search = mergedQuery.toString();

  return new URLResult(url, { query, parameters, baseURL: base });
}

function createURL(url: string | URL, base?: string | URL) {
  return new URL(url, base);
}

function parseQuery(query: Query) {
  if (isURL(query)) return query;

  return isString(query) ? new URLSearchParams(query) : toFormData(query || {}, defaultFormSerializer, URLSearchParams);
}

function mergeQuery(query: URL | URLSearchParams, queryToMerge: URL | URLSearchParams) {
  if (isURL(query)) {
    query = query.searchParams;
  }

  if (isURL(queryToMerge)) {
    queryToMerge = queryToMerge.searchParams;
  }

  return new URLSearchParams([...query, ...queryToMerge]);
}

function replaceParameters(parameters: URLParameters, url: string) {
  const parameterNames = Array.from(url.match(/(?<={{)(.*?)(?=}})/g) || []);

  return parameterNames.reduce((resultUrl, parameterName) => {
    const parameterValue = getFromPath(parameters, parameterName);

    if (!parameterValue) {
      return resultUrl;
    }

    return resultUrl.replace(new RegExp(`{{${parameterName}}}`, 'g'), String(parameterValue));
  }, url);
}

export function buildURL(url: RequestURL, options?: sefarisURLOptions) {
  return build(url, options);
}

export function isValidURL(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export { URLResult };
