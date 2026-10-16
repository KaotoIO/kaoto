import { fireEvent, render, screen } from '@testing-library/react';

import { ErrorDetails } from './ErrorDetails';

describe('ErrorDetails', () => {
  it('should render the "Show more" toggle and the message in a code snippet', () => {
    render(<ErrorDetails message="Boom: something failed" />);

    expect(screen.getByRole('button', { name: /Show more/ })).toBeInTheDocument();
    expect(screen.getByText('Boom: something failed')).toBeInTheDocument();
  });

  it('should switch the toggle label to "Show less" when expanded', () => {
    render(<ErrorDetails message="Boom: something failed" />);

    fireEvent.click(screen.getByRole('button', { name: /Show more/ }));

    expect(screen.getByRole('button', { name: /Show less/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show more/ })).not.toBeInTheDocument();
  });
});
