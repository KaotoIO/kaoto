import { fireEvent, render, screen } from '@testing-library/react';

import { NodeFormFallback } from './NodeFormFallback';

describe('NodeFormFallback', () => {
  const defaultProps = {
    title: 'Timer',
    iconUrl: 'https://example.com/timer.svg',
    onClose: vi.fn(),
    message: 'Something exploded',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the node title', () => {
    render(<NodeFormFallback {...defaultProps} />);
    expect(screen.getByText('Timer')).toBeInTheDocument();
  });

  it('renders the error notification', () => {
    render(<NodeFormFallback {...defaultProps} />);
    expect(screen.getByTestId('error-notification')).toBeInTheDocument();
  });

  it('renders a "Show more" toggle that reveals the error message', () => {
    render(<NodeFormFallback {...defaultProps} />);
    const toggle = screen.getByRole('button', { name: /Show more/i });
    expect(toggle).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByTestId('error-details-message')).toHaveTextContent('Something exploded');
  });

  it('calls onClose when the Close button is clicked', () => {
    render(<NodeFormFallback {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
