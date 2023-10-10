/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
require('jest-fetch-mock').enableMocks();

const streams = require('web-streams-polyfill/ponyfill');
// global.window = window;
global.window.ReadableStream = streams.ReadableStream;
