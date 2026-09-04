import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

const ThrowingComponent = ({ message = 'Test error' }: { message?: string }) => {
  throw new Error(message);
};

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <p>Safe content</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('renders default ErrorState when a child throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Boom!" />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Boom!')).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('renders the custom fallback when provided and a child throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('does not render the custom fallback when there is no error', () => {
    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <p>Safe content</p>
      </ErrorBoundary>,
    );
    expect(screen.queryByText('Custom fallback')).not.toBeInTheDocument();
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });
});
