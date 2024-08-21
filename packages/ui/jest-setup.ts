import '@testing-library/jest-dom';
// import '@testing-library/jest-dom/extend-expect'
import { install, XSLTProcessor } from 'xslt-ts';

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

jest
  .spyOn(global, 'crypto', 'get')
  .mockImplementation(() => ({ getRandomValues: () => [12345678] }) as unknown as Crypto);

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
});

// Inject xslt-ts implementation since jsdom doesn't provide XSLTProcessor
install(new DOMParser(), new XMLSerializer(), document.implementation);
global.XSLTProcessor = XSLTProcessor;
window.XSLTProcessor = XSLTProcessor;
