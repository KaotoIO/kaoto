import { render, screen } from '@testing-library/react';

import { ErrorNotification } from './ErrorNotification';

describe('ErrorNotification', () => {
  it('should render the title and the default subtitle', () => {
    render(<ErrorNotification title="Something went wrong" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Please reload the editor')).toBeInTheDocument();
  });

  it('should render a custom subtitle', () => {
    render(<ErrorNotification title="Something went wrong" subtitle="Try again later" />);

    expect(screen.getByText('Try again later')).toBeInTheDocument();
    expect(screen.queryByText('Please reload the editor')).not.toBeInTheDocument();
  });
});
