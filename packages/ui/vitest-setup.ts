import '@testing-library/jest-dom/vitest';
// Setup vitest-canvas-mock
import 'vitest-canvas-mock';

import { getRandomValues, subtle } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';

import { beforeEach, vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';

Object.defineProperties(globalThis, {
  TextDecoder: { value: TextDecoder },
  TextEncoder: { value: TextEncoder },
});

// Mock ResizeObserver for components that use it
// NOTE: Using regular function instead of arrow function to fix constructor issues
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

// Mock IntersectionObserver for visibility tracking
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
});

// Mock MutationObserver for DOM change tracking
class MutationObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn();
}

Object.defineProperty(globalThis, 'MutationObserver', {
  writable: true,
  value: MutationObserverMock,
});

// Mock SVG methods to avoid errors when running tests
// Taken from: https://github.com/apexcharts/react-apexcharts/issues/52#issuecomment-844757362
Object.defineProperty(globalThis.SVGElement.prototype, 'getScreenCTM', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(globalThis.SVGElement.prototype, 'getBBox', {
  writable: true,
  value: vi.fn().mockReturnValue({ x: 0, y: 0 }),
});

Object.defineProperty(globalThis.SVGElement.prototype, 'getComputedTextLength', {
  writable: true,
  value: vi.fn().mockReturnValue(0),
});

Object.defineProperty(globalThis.SVGElement.prototype, 'createSVGMatrix', {
  writable: true,
  value: vi.fn().mockReturnValue({
    x: 10,
    y: 10,
    inverse: () => {},
    multiply: () => {},
  }),
});

// Setup fetch mock
const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.spyOn(globalThis, 'crypto', 'get').mockImplementation(() => ({ getRandomValues, subtle }) as unknown as Crypto);

// Suppress specific known warnings to reduce noise in test output
const suppressedWarnings = [
  '[mobx-react-lite] importing batchingForReactDom is no longer needed',
  'NODE_ENV is not defined',
];

vi.spyOn(console, 'warn').mockImplementation((...args) => {
  const message = args[0]?.toString() ?? '';
  if (suppressedWarnings.some((warning) => message.includes(warning))) {
    return;
  }
  console.log(...args);
});

// Mock requestAnimationFrame to execute in next microtask
// This prevents stack overflow from animation loops while remaining deterministic
// Tests that need specific RAF behavior can override this in their own beforeEach hooks
function rafMock(callback: FrameRequestCallback): number {
  // Execute in next microtask to avoid stack overflow from animation loops (e.g., d3-timer)
  // while still being fast and deterministic
  queueMicrotask(() => callback(performance.now()));
  return 0;
}

function cafMock(): void {
  // No-op since we don't track RAF IDs
}

// Define on both globalThis and window to ensure availability in all contexts
Object.defineProperty(globalThis, 'requestAnimationFrame', {
  writable: true,
  configurable: true,
  value: rafMock,
});

Object.defineProperty(globalThis, 'cancelAnimationFrame', {
  writable: true,
  configurable: true,
  value: cafMock,
});

// Also set on window for jsdom compatibility
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  configurable: true,
  value: rafMock,
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  configurable: true,
  value: cafMock,
});

beforeEach(() => {
  // Reset fetch mocks between tests
  fetchMocker.mockResolvedValue(null as unknown as Response);

  // Re-apply requestSubmit polyfill for each test
  // This ensures the polyfill is available even in parallel test execution
  Object.defineProperty(HTMLFormElement.prototype, 'requestSubmit', {
    writable: true,
    configurable: true,
    value: function (submitter?: HTMLElement) {
      if (submitter) {
        const submitButton = submitter as HTMLButtonElement | HTMLInputElement;
        if (submitButton.type !== 'submit') {
          throw new TypeError('The specified element is not a submit button');
        }
        if ('form' in submitButton && submitButton.form !== this) {
          throw new DOMException('The specified element is not owned by this form element', 'NotFoundError');
        }
      }

      // Dispatch the submit event
      const submitEvent = new Event('submit', {
        bubbles: true,
        cancelable: true,
      });
      this.dispatchEvent(submitEvent);
    },
  });
});

Element.prototype.scrollIntoView = vi.fn();

// Mock deprecated document.queryCommandSupported for Monaco Editor
// This API has been removed from modern browsers but Monaco Editor still uses it
Object.defineProperty(document, 'queryCommandSupported', {
  writable: true,
  value: vi.fn().mockReturnValue(false),
});

// Mock ClipboardItem for Monaco Editor
// jsdom doesn't implement the ClipboardItem API which Monaco Editor uses
if (typeof ClipboardItem === 'undefined') {
  class ClipboardItemMock {
    private readonly data: Record<string, string | Blob | Promise<string | Blob>>;
    constructor(data: Record<string, string | Blob | Promise<string | Blob>>) {
      this.data = data;
    }
    async getType(type: string): Promise<Blob> {
      const value = this.data[type];
      if (value instanceof Blob) {
        return value;
      }
      const resolved = await Promise.resolve(value);
      if (resolved instanceof Blob) {
        return resolved;
      }
      return new Blob([resolved], { type });
    }
  }

  Object.defineProperty(globalThis, 'ClipboardItem', {
    writable: true,
    value: ClipboardItemMock,
  });
}

// Mock Clipboard API for Monaco Editor
// Monaco Editor uses navigator.clipboard.write() which isn't available in jsdom
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  configurable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
    write: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue([]),
  },
});

// Implement fail function for Jest compatibility
Object.defineProperty(globalThis, 'fail', {
  writable: true,
  value: (message?: string): never => {
    throw new Error(message || 'Test failed');
  },
});

// Suppress Monaco Editor CancellationError from unhandled rejections
// Monaco Editor's clipboard service creates deferred promises that get cancelled
// during test cleanup, which causes unhandled rejection errors
// Use process.on instead of window event listeners as Vitest intercepts errors before window listeners
if (typeof process !== 'undefined') {
  // Remove any existing listeners to avoid duplicates
  process.removeAllListeners('unhandledRejection');

  // Add our custom handler
  process.on('unhandledRejection', (reason: unknown) => {
    // Suppress Monaco Editor clipboard cancellation errors
    const error = reason as { name?: string; message?: string };
    if (error?.name !== 'CancellationError' && error?.message !== 'Canceled') {
      // Re-throw other unhandled rejections so they get reported
      throw reason;
    }
    // Silently ignore Monaco CancellationError
  });
}
