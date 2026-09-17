import '@testing-library/jest-dom/vitest';

import { beforeEach, vi } from 'vitest';

// Mock Carbon's Toggletip with a passthrough that renders its children but
// avoids activating @floating-ui/react's useFloating (which happens when
// Toggletip's underlying Popover has autoAlign set). In React 19's act(), the
// useFloating → computePosition → flushSync(setData) chain loops indefinitely
// via recursivelyFlushAsyncActWork and prevents tests from settling in jsdom.
//
// We mock @carbon/react at the package level. Toggletip is re-exported from
// @carbon/react, and our factory replaces it with a simplified passthrough.
// This works because vi.mock() in setupFiles is hoisted and applied globally.
vi.mock('@carbon/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@carbon/react')>();
  const React = await import('react');

  // Simple passthrough: renders children directly, content always visible.
  // ToggletipButton forwards its `label` prop as aria-label so tests using
  // getByLabelText() can still locate the button.
  const Toggletip: React.FC<React.ComponentProps<typeof actual.Toggletip>> = ({ children }) =>
    React.createElement(React.Fragment, null, children);
  Toggletip.displayName = 'Toggletip';

  const ToggletipButton: React.FC<React.ComponentProps<typeof actual.ToggletipButton>> = ({ label, children }) =>
    React.createElement('button', { type: 'button', 'aria-label': label }, children);
  ToggletipButton.displayName = 'ToggletipButton';

  const ToggletipContent: React.FC<React.ComponentProps<typeof actual.ToggletipContent>> = ({ children }) =>
    React.createElement(React.Fragment, null, children);
  ToggletipContent.displayName = 'ToggletipContent';

  return { ...actual, Toggletip, ToggletipButton, ToggletipContent };
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
});

// Mock MutationObserver
class MutationObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn();
}
Object.defineProperty(globalThis, 'MutationObserver', {
  writable: true,
  value: MutationObserverMock,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Element.prototype.scrollIntoView = vi.fn();

beforeEach(() => {
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
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      this.dispatchEvent(submitEvent);
    },
  });
});
