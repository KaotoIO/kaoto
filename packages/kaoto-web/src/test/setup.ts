import '@testing-library/jest-dom/vitest';

// Mocking methods which are not implemented in JSDOM
// If some code uses a method which JSDOM (the DOM implementation used by Jest) hasn't implemented yet,
// testing it is not easily possible. This is e.g. the case with window.matchMedia().
// Jest returns TypeError: window.matchMedia is not a function and doesn't properly execute the test.
// https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom

// In this case, mocking matchMedia in the test file should solve the issue:

Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // Deprecated
    removeListener: () => {}, // Deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

globalThis.ResizeObserver = class {
  observe() {
    /* JSDOM stub — no implementation needed */
  }
  unobserve() {
    /* JSDOM stub — no implementation needed */
  }
  disconnect() {
    /* JSDOM stub — no implementation needed */
  }
};
