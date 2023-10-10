import { EasyResponse } from '../easy-response';

export interface XhrOptions<DataSchema> {
  onLoadStart?: () => void;
  onLoad?: (easyResponse: EasyResponse<DataSchema>, stopDownload?: () => void) => void;
  onLoadEnd?: (e: ProgressEvent) => void;
  onUploadProgress?: (e: ProgressEvent) => void;
  onDownloadProgress?: (e: ProgressEvent) => void;
  state?: {
    opened?: (this: XMLHttpRequest) => void;
    loading?: (this: XMLHttpRequest) => void;
    headersReceived?: (this: XMLHttpRequest) => void;
    done?: (this: XMLHttpRequest) => void;
    unsent?: (this: XMLHttpRequest) => void;
  };
  upload?: {
    onLoadStart?: (this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown;
    onLoad?: (this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown;
    onLoadEnd?: (this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown;
  };
}
