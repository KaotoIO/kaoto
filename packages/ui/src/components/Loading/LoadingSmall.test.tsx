import { render } from '@testing-library/react';

import { LoadingSmall } from './LoadingSmall';

describe('LoadingSmall', () => {
  it('should render a small spinner with default description', () => {
    const { getByRole } = render(<LoadingSmall />);
    const spinner = getByRole('img', { name: 'Loading' });

    expect(spinner).toBeInTheDocument();
  });

  it('should render a small spinner with custom description', () => {
    const { getByRole } = render(<LoadingSmall description="Uploading schema files" />);
    const spinner = getByRole('img', { name: 'Uploading schema files' });

    expect(spinner).toBeInTheDocument();
  });

  it('should render the Carbon small loading CSS class', () => {
    const { container } = render(<LoadingSmall />);

    expect(container.querySelector('.cds--loading--small')).toBeInTheDocument();
  });
});
