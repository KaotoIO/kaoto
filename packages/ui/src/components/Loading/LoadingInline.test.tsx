import { render } from '@testing-library/react';

import { LoadingInline } from './LoadingInline';

describe('LoadingInline', () => {
  it('should render the Carbon inline loading CSS class', () => {
    const { container } = render(<LoadingInline />);

    expect(container.querySelector('.cds--inline-loading')).toBeInTheDocument();
  });

  it('should render provided description text', () => {
    const { getByText } = render(<LoadingInline description="Fetching data" />);

    expect(getByText('Fetching data')).toBeInTheDocument();
  });

  it('should use iconDescription as the accessible name on the spinner icon', () => {
    const { getByTitle } = render(<LoadingInline iconDescription="Processing" />);

    expect(getByTitle('Processing')).toBeInTheDocument();
  });

  it('should use default iconDescription "Loading" when not provided', () => {
    const { getByTitle } = render(<LoadingInline />);

    expect(getByTitle('Loading')).toBeInTheDocument();
  });
});
