import { render } from '@testing-library/react';

import { CatalogLayout } from './Catalog.models';
import { CatalogLayoutIcon } from './CatalogLayoutIcon';

describe('CatalogLayoutIcon', () => {
  it('renders gallery icon correctly', () => {
    const { container } = render(<CatalogLayoutIcon layout={CatalogLayout.Gallery} />);
    expect(container).toMatchSnapshot();
  });

  it('renders list icon correctly', () => {
    const { container } = render(<CatalogLayoutIcon layout={CatalogLayout.List} />);
    expect(container).toMatchSnapshot();
  });

  it('renders unknown icon correctly', () => {
    const { container } = render(<CatalogLayoutIcon layout={'unknown' as CatalogLayout} />);
    expect(container).toMatchSnapshot();
  });
});
