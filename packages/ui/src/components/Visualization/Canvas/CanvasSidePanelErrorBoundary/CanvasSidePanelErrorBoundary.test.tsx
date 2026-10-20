import { fireEvent, render, screen } from '@testing-library/react';

import { CanvasSidePanelErrorBoundary } from './CanvasSidePanelErrorBoundary';

describe('CanvasSidePanelErrorBoundary', () => {
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
      <CanvasSidePanelErrorBoundary onClose={vi.fn()}>
        <div>child content</div>
      </CanvasSidePanelErrorBoundary>,
    );

    expect(screen.getByText('child content')).toBeInTheDocument();
    expect(screen.queryByTestId('error-notification')).not.toBeInTheDocument();
    expect(screen.queryByTestId('close-side-bar')).not.toBeInTheDocument();
  });

  it('should render the default error title, the subtitle and the error message when a child throws', () => {
    render(
      <CanvasSidePanelErrorBoundary onClose={vi.fn()}>
        <Thrower error={new Error('boom')} />
      </CanvasSidePanelErrorBoundary>,
    );

    expect(screen.getByTestId('error-notification')).toBeInTheDocument();
    expect(screen.getByText('Something did not work as expected')).toBeInTheDocument();
    expect(screen.getByText('Please reload the editor')).toBeInTheDocument();
    expect(screen.getByTestId('error-details-message')).toHaveTextContent('boom');
  });

  it('should render a custom error title', () => {
    render(
      <CanvasSidePanelErrorBoundary onClose={vi.fn()} errorTitle="This node cannot be configured">
        <Thrower error={new Error('boom')} />
      </CanvasSidePanelErrorBoundary>,
    );

    expect(screen.getByText('This node cannot be configured')).toBeInTheDocument();
    expect(screen.queryByText('Something did not work as expected')).not.toBeInTheDocument();
  });

  it('should render the header title when a title is provided', () => {
    render(
      <CanvasSidePanelErrorBoundary onClose={vi.fn()} title="Timer">
        <Thrower error={new Error('boom')} />
      </CanvasSidePanelErrorBoundary>,
    );

    expect(screen.getByText('Timer')).toBeInTheDocument();
  });

  it('should not render the header title when no title is provided', () => {
    render(
      <CanvasSidePanelErrorBoundary onClose={vi.fn()}>
        <Thrower error={new Error('boom')} />
      </CanvasSidePanelErrorBoundary>,
    );

    expect(screen.queryByText('Timer')).not.toBeInTheDocument();
    expect(screen.getByTestId('close-side-bar')).toBeInTheDocument();
  });

  it('should switch the toggle label from "Show more" to "Show less" when expanded', () => {
    render(
      <CanvasSidePanelErrorBoundary onClose={vi.fn()}>
        <Thrower error={new Error('boom')} />
      </CanvasSidePanelErrorBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Show more/ }));

    expect(screen.getByRole('button', { name: /Show less/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show more/ })).not.toBeInTheDocument();
  });

  it('should call onClose when the Close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <CanvasSidePanelErrorBoundary onClose={onClose}>
        <Thrower error={new Error('boom')} />
      </CanvasSidePanelErrorBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Close/ }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a string', 'plain string failure', 'plain string failure'],
    ['an object', { code: 42 }, '{"code":42}'],
  ])('should use %s thrown as the error message', (_label, thrown, expectedMessage) => {
    render(
      <CanvasSidePanelErrorBoundary onClose={vi.fn()}>
        <Thrower error={thrown} />
      </CanvasSidePanelErrorBoundary>,
    );

    expect(screen.getByTestId('error-details-message')).toHaveTextContent(expectedMessage);
  });
});
