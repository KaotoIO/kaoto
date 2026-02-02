import '@testing-library/jest-dom';
import { setupJestCanvasMock } from 'jest-canvas-mock';
import { getRandomValues, subtle } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';

Object.defineProperties(globalThis, {
  TextDecoder: { value: TextDecoder },
  TextEncoder: { value: TextEncoder },
});

// Mock ResizeObserver for components that use it
class ResizeObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

// Mock IntersectionObserver for visibility tracking
class IntersectionObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
});

// Mock MutationObserver for DOM change tracking
class MutationObserverMock {
  observe = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn();
}

Object.defineProperty(globalThis, 'MutationObserver', {
  writable: true,
  value: MutationObserverMock,
});

enableSVGElementMocks();

Object.defineProperty(window, 'fetch', {
  writable: true,
  value: jest.fn(),
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

jest.spyOn(globalThis, 'crypto', 'get').mockImplementation(() => ({ getRandomValues, subtle }) as unknown as Crypto);

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

Element.prototype.scrollIntoView = jest.fn();

function enableSVGElementMocks() {
  /**
   * Mocking the following SVG methods to avoid errors when running tests
   *
   * Taken from the following comment:
   * https://github.com/apexcharts/react-apexcharts/issues/52#issuecomment-844757362
   */

  Object.defineProperty(globalThis.SVGElement.prototype, 'getScreenCTM', {
    writable: true,
    value: jest.fn(),
  });

  Object.defineProperty(globalThis.SVGElement.prototype, 'getBBox', {
    writable: true,
    value: jest.fn().mockReturnValue({
      x: 0,
      y: 0,
    }),
  });

  Object.defineProperty(globalThis.SVGElement.prototype, 'getComputedTextLength', {
    writable: true,
    value: jest.fn().mockReturnValue(0),
  });

  Object.defineProperty(globalThis.SVGElement.prototype, 'createSVGMatrix', {
    writable: true,
    value: jest.fn().mockReturnValue({
      x: 10,
      y: 10,
      inverse: () => {},
      multiply: () => {},
    }),
  });
}
