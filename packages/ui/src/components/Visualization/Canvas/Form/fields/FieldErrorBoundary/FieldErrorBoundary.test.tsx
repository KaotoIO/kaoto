import { fireEvent, render, screen } from '@testing-library/react';

import { FieldErrorBoundary } from './FieldErrorBoundary';

describe('FieldErrorBoundary', () => {
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });

  const Thrower = ({ error }: { error: unknown }) => {
    throw error;
  };

  it('should render the children when nothing throws', () => {
    render(
      <FieldErrorBoundary>
        <div>child content</div>
      </FieldErrorBoundary>,
    );

    expect(screen.getByText('child content')).toBeInTheDocument();
    expect(screen.queryByTestId('error-notification')).not.toBeInTheDocument();
  });

  it('should render the default title, the subtitle and the error message when a child throws', () => {
    render(
      <FieldErrorBoundary>
        <Thrower error={new Error('boom')} />
      </FieldErrorBoundary>,
    );

    expect(screen.getByText('Field editor unavailable')).toBeInTheDocument();
    expect(screen.getByText('Please reload the editor')).toBeInTheDocument();
    expect(screen.getByTestId('error-details-message')).toHaveTextContent('boom');
  });

  it('should render a custom title', () => {
    render(
      <FieldErrorBoundary title="Expression editor unavailable">
        <Thrower error={new Error('boom')} />
      </FieldErrorBoundary>,
    );

    expect(screen.getByText('Expression editor unavailable')).toBeInTheDocument();
  });

  it('should switch the toggle label from "Show more" to "Show less" when expanded', () => {
    render(
      <FieldErrorBoundary>
        <Thrower error={new Error('boom')} />
      </FieldErrorBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Show more/ }));

    expect(screen.getByRole('button', { name: /Show less/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show more/ })).not.toBeInTheDocument();
  });

  it.each([
    ['a string', 'plain string failure', 'plain string failure'],
    ['an object', { code: 42 }, '{"code":42}'],
  ])('should use %s thrown as the error message', (_label, thrown, expectedMessage) => {
    render(
      <FieldErrorBoundary>
        <Thrower error={thrown} />
      </FieldErrorBoundary>,
    );

    expect(screen.getByTestId('error-details-message')).toHaveTextContent(expectedMessage);
  });
});
