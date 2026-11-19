import { render } from '@testing-library/react';

import { Loading } from './Loading';

describe('Loading', () => {
  it('should render a spinner with default description', () => {
    const { getByRole } = render(<Loading />);
    const spinner = getByRole('img', { name: 'Loading' });

    expect(spinner).toBeInTheDocument();
  });

  it('should render a spinner with custom description', () => {
    const { getByRole } = render(<Loading description="Fetching data" />);
    const spinner = getByRole('img', { name: 'Fetching data' });

    expect(spinner).toBeInTheDocument();
  });

  it('should render children next to the spinner', () => {
    const { getByText } = render(<Loading>Loading content</Loading>);

    expect(getByText('Loading content')).toBeInTheDocument();
  });

  it('should not nest block content inside a paragraph', () => {
    const { getByRole } = render(
      <Loading>
        <h3>Loading entities...</h3>
      </Loading>,
    );

    const heading = getByRole('heading', { level: 3, name: 'Loading entities...' });

    expect(heading.closest('p')).toBeNull();
  });

  it('should render the Carbon loading CSS class', () => {
    const { container } = render(<Loading />);

    expect(container.querySelector('.cds--loading')).toBeInTheDocument();
  });
});
