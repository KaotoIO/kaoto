import '@testing-library/jest-dom';
import { setupJestCanvasMock } from 'jest-canvas-mock';
import { subtle } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { FilterDOMPropsKeys, filterDOMProps } from 'uniforms';

Object.defineProperties(global, {
  TextDecoder: { value: TextDecoder },
  TextEncoder: { value: TextEncoder },
});

filterDOMProps.register('inputRef' as FilterDOMPropsKeys, 'placeholder' as FilterDOMPropsKeys);
enableSVGElementMocks();

Object.defineProperty(window, 'fetch', {
  writable: true,
  value: jest.fn(),
});

jest
  .spyOn(global, 'crypto', 'get')
  .mockImplementation(() => ({ getRandomValues: () => [12345678], subtle }) as unknown as Crypto);

jest.spyOn(console, 'warn').mockImplementation((...args) => {
  if (
    args[0].toString().includes('[mobx-react-lite] importing batchingForReactDom is no longer needed') ||
    args[0].toString().includes('NODE_ENV is not defined')
  ) {
    return;
  }

  console.log(...args);
});

const fetchMock = jest.spyOn(window, 'fetch');

beforeEach(() => {
  fetchMock.mockResolvedValue(null as unknown as Response);
  setupJestCanvasMock();
});

function enableSVGElementMocks() {
  /**
   * Mocking the following SVG methods to avoid errors when running tests
   *
   * Taken from the following comment:
   * https://github.com/apexcharts/react-apexcharts/issues/52#issuecomment-844757362
   */

  Object.defineProperty(global.SVGElement.prototype, 'getScreenCTM', {
    writable: true,
    value: jest.fn(),
  });

  Object.defineProperty(global.SVGElement.prototype, 'getBBox', {
    writable: true,
    value: jest.fn().mockReturnValue({
      x: 0,
      y: 0,
    }),
  });

  Object.defineProperty(global.SVGElement.prototype, 'getComputedTextLength', {
    writable: true,
    value: jest.fn().mockReturnValue(0),
  });

  Object.defineProperty(global.SVGElement.prototype, 'createSVGMatrix', {
    writable: true,
    value: jest.fn().mockReturnValue({
      x: 10,
      y: 10,
      inverse: () => {},
      multiply: () => {},
    }),
  });
}
