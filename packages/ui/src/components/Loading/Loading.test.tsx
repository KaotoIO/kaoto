import { render } from '@testing-library/react';

import { Loading } from './Loading';

describe('Loading component', () => {
  it('renders a spinner', () => {
    const { getByRole } = render(<Loading />);
    const spinner = getByRole('progressbar');

    expect(spinner).toBeInTheDocument();
  });
});
