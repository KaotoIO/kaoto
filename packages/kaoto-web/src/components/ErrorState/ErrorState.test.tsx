import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('should render with default title and message', () => {
    render(<ErrorState message="Something went wrong" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should render with custom title', () => {
    render(<ErrorState title="Custom Error" message="Something went wrong" />);
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
  });

  it('should render error kind by default', () => {
    const { container } = render(<ErrorState message="Something went wrong" />);
    const notification = container.querySelector('.cds--inline-notification--error');
    expect(notification).toBeInTheDocument();
  });

  it('should render warning kind when specified', () => {
    const { container } = render(<ErrorState message="Warning message" kind="warning" />);
    const notification = container.querySelector('.cds--inline-notification--warning');
    expect(notification).toBeInTheDocument();
  });

  it('should render info kind when specified', () => {
    const { container } = render(<ErrorState message="Info message" kind="info" />);
    const notification = container.querySelector('.cds--inline-notification--info');
    expect(notification).toBeInTheDocument();
  });

  it('should not render retry button when onRetry is not provided', () => {
    render(<ErrorState message="Something went wrong" />);
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('should render retry button when onRetry is provided', () => {
    const mockOnRetry = vi.fn();
    render(<ErrorState message="Something went wrong" onRetry={mockOnRetry} />);
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnRetry = vi.fn();
    render(<ErrorState message="Something went wrong" onRetry={mockOnRetry} />);

    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should render retry button with icon', () => {
    const mockOnRetry = vi.fn();
    render(<ErrorState message="Something went wrong" onRetry={mockOnRetry} />);
    const retryButton = screen.getByRole('button', { name: /retry/i });
    const icon = retryButton.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should apply custom class names', () => {
    const { container } = render(<ErrorState message="Something went wrong" />);
    expect(container.querySelector('.cs--error-state')).toBeInTheDocument();
    expect(container.querySelector('.cs--error-state__notification')).toBeInTheDocument();
  });

  it('should render low contrast notification', () => {
    const { container } = render(<ErrorState message="Something went wrong" />);
    const notification = container.querySelector('.cds--inline-notification--low-contrast');
    expect(notification).toBeInTheDocument();
  });

  it('should hide close button on notification', () => {
    const { container } = render(<ErrorState message="Something went wrong" />);
    const closeButton = container.querySelector('.cds--inline-notification__close-button');
    expect(closeButton).not.toBeInTheDocument();
  });

  it('should render with all props combined', async () => {
    const user = userEvent.setup();
    const mockOnRetry = vi.fn();
    const { container } = render(
      <ErrorState title="Network Error" message="Failed to fetch data" kind="warning" onRetry={mockOnRetry} />,
    );

    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
    expect(container.querySelector('.cds--inline-notification--warning')).toBeInTheDocument();

    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should render retry button with tertiary kind', () => {
    const mockOnRetry = vi.fn();
    const { container } = render(<ErrorState message="Something went wrong" onRetry={mockOnRetry} />);
    const button = container.querySelector('.cds--btn--tertiary');
    expect(button).toBeInTheDocument();
  });

  it('should render retry button with small size', () => {
    const mockOnRetry = vi.fn();
    const { container } = render(<ErrorState message="Something went wrong" onRetry={mockOnRetry} />);
    const button = container.querySelector('.cds--btn--sm');
    expect(button).toBeInTheDocument();
  });
});

// Made with Bob
