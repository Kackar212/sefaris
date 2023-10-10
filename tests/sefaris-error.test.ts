import { sefaris, EasyResponse, EasyRequest, SefarisError } from '@sefaris/core';
import { DataType } from '@sefaris/shared';

describe('SefarisError', () => {
  describe('create', () => {
    it('should create SefarisError instance', () => {
      const sefarisError = SefarisError.create('foo', SefarisError.NETWORK, {});

      expect(sefarisError).toBeInstanceOf(SefarisError);
      expect(sefarisError.message).toBe('foo');
      expect(sefarisError.type).toBe(SefarisError.NETWORK);
    });
  });

  describe('getStatusCode', () => {
    it('should return correct status code or -1 if response is undefined', async () => {
      fetchMock.mockResponseOnce('', { status: 404 });

      const error = SefarisError.create('', SefarisError.NETWORK, {});
      expect(error.getStatusCode()).toBe(-1);

      try {
        await sefaris.get('https://example.com');
        fail();
      } catch (e: unknown) {
        if (sefaris.isSefarisError(e)) {
          expect(e.getStatusCode()).toBe(404);
        } else {
          fail();
        }
      }
    });
  });

  describe('isResponseError', () => {
    it('should return true if error was caused by response', async () => {
      fetchMock.mockResponseOnce('', { status: 500 });

      try {
        await sefaris.get('https://example.com');
        fail();
      } catch (e) {
        if (sefaris.isSefarisError(e)) {
          expect(e.isResponseError()).toBe(true);
        } else {
          fail();
        }
      }
    });
  });

  describe('getResponse', () => {
    it('should return EasyResponse or undefined', async () => {
      fetchMock.mockResponseOnce('{}', { status: 404 });

      try {
        await sefaris.get('https://example.com');
        fail();
      } catch (e) {
        if (sefaris.isSefarisError(e)) {
          const response = e.getResponse();

          expect(response).toBeInstanceOf(EasyResponse);
          expect(response?.status).toBe(404);
        } else {
          fail();
        }
      }
    });
  });
  describe('getNativeResponse', () => {
    it('should return Response or undefined', async () => {
      fetchMock.mockResponseOnce('{}', { status: 404 });

      try {
        await sefaris.get('https://example.com');
        fail();
      } catch (e) {
        if (sefaris.isSefarisError(e)) {
          const response = e.getNativeResponse();

          expect(response).toBeInstanceOf(Response);
          expect(response?.status).toBe(404);
        } else {
          fail();
        }
      }

      try {
        await sefaris.get('', { responseBodyType: 'foo' as DataType });
        fail();
      } catch (e) {
        if (!sefaris.isSefarisError(e)) return;

        expect(e.getNativeResponse()).toBe(undefined);
      }
    });
  });

  describe('getRequest', () => {
    it('should return EasyRequest or undefined', async () => {
      fetchMock.mockResponseOnce('{}', { status: 404 });

      try {
        await sefaris.get('https://example.com');
        fail();
      } catch (e) {
        if (sefaris.isSefarisError(e)) {
          const request = e.getRequest();

          expect(request).toBeInstanceOf(EasyRequest);
        } else {
          fail();
        }
      }

      try {
        await sefaris.get('https://example.com', { responseBodyType: 'foo' as DataType });
        fail();
      } catch (e) {
        if (sefaris.isSefarisError(e)) {
          const request = e.getRequest();

          expect(request).toBe(undefined);
        } else {
          fail();
        }
      }
    });
  });

  describe('toPlain', () => {
    it('should return SefarisError as plain object', async () => {
      fetchMock.mockResponseOnce('{}', { status: 404 });

      try {
        await sefaris.get('https://example.com');
        fail();
      } catch (e) {
        if (sefaris.isSefarisError(e)) {
          const error = e.toPlain();

          expect(error).toEqual({
            name: e.type,
            message: e.message,
            stack: e.stack,
            cause: e.cause,
            code: e.code,
          });
        } else {
          fail();
        }
      }
    });
  });
});
