import { fireEvent, render, screen } from '@testing-library/react';

import { SidebarFallback } from './SidebarFallback';

describe('SidebarFallback', () => {
  const defaultProps = {
    onClose: vi.fn(),
    message: 'FilteredFieldProvider blew up',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the error notification', () => {
    render(<SidebarFallback {...defaultProps} />);
    expect(screen.getByTestId('error-notification')).toBeInTheDocument();
  });

  it('renders a "Show more" toggle that reveals the error message', () => {
    render(<SidebarFallback {...defaultProps} />);
    const toggle = screen.getByRole('button', { name: /Show more/i });
    expect(toggle).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByTestId('error-details-message')).toHaveTextContent('FilteredFieldProvider blew up');
  });

  it('calls onClose when the Close button is clicked', () => {
    render(<SidebarFallback {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
