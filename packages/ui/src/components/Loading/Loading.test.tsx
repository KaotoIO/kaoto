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

  it('should render the Carbon loading CSS class', () => {
    const { container } = render(<Loading />);

    expect(container.querySelector('.cds--loading')).toBeInTheDocument();
  });

  it('should not render the small Carbon spinner by default', () => {
    const { container } = render(<Loading />);

    expect(container.querySelector('.cds--loading--small')).not.toBeInTheDocument();
  });

  it('should render the small Carbon spinner when `small` is set', () => {
    const { container } = render(<Loading small />);

    expect(container.querySelector('.cds--loading')).toBeInTheDocument();
    expect(container.querySelector('.cds--loading--small')).toBeInTheDocument();
  });

  it('should keep the description and children when `small` is set', () => {
    const { getByRole, getByText } = render(
      <Loading small description="Fetching data">
        Loading content
      </Loading>,
    );

    expect(getByRole('img', { name: 'Fetching data' })).toBeInTheDocument();
    expect(getByText('Loading content')).toBeInTheDocument();
  });

  it('should not render the full page modifier by default', () => {
    const { container } = render(<Loading />);

    expect(container.querySelector('.loading')).toBeInTheDocument();
    expect(container.querySelector('.loading--full-page')).not.toBeInTheDocument();
  });

  it('should render the full page modifier when `fullPage` is set', () => {
    const { container } = render(<Loading fullPage />);

    expect(container.querySelector('.loading.loading--full-page')).toBeInTheDocument();
  });

  it('should not render the Carbon overlay by default', () => {
    const { container } = render(<Loading />);

    expect(container.querySelector('.cds--loading-overlay')).not.toBeInTheDocument();
  });

  describe('withOverlay', () => {
    it('should render the Carbon overlay when `withOverlay` is set', () => {
      const { container } = render(<Loading withOverlay />);

      expect(container.querySelector('.cds--loading-overlay')).toBeInTheDocument();
    });

    it('should render the spinner with the description', () => {
      const { getByRole } = render(<Loading withOverlay description="Fetching data" />);

      expect(getByRole('img', { name: 'Fetching data' })).toBeInTheDocument();
    });

    it('should not render the `.loading` wrapper', () => {
      const { container } = render(<Loading withOverlay />);

      expect(container.querySelector('.loading')).not.toBeInTheDocument();
    });

    it('should not render the children', () => {
      const { queryByText } = render(<Loading withOverlay>Loading content</Loading>);

      expect(queryByText('Loading content')).not.toBeInTheDocument();
    });

    it('should render the `data-testid` on the Carbon spinner element', () => {
      const { getByTestId } = render(<Loading withOverlay data-testid="loading-test" />);

      expect(getByTestId('loading-test')).toHaveClass('cds--loading');
    });
  });

  it('should render the `data-testid` on the wrapper, with or without children', () => {
    const { getByTestId, rerender } = render(<Loading data-testid="loading-test" />);

    expect(getByTestId('loading-test')).toHaveClass('loading');

    rerender(<Loading data-testid="loading-test">Loading content</Loading>);

    expect(getByTestId('loading-test')).toHaveClass('loading');
  });
});
