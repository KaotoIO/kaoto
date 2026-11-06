import { render, screen } from '@testing-library/react';

import { FormToolbar } from './FormToolbar';

describe('FormToolbar', () => {
  it('renders only the filter field', () => {
    render(<FormToolbar showFilterField />);

    expect(screen.getByTestId('filter-fields')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-All')).not.toBeInTheDocument();
  });

  it('renders only the section tabs', () => {
    render(<FormToolbar showSectionTabs />);

    expect(screen.getByTestId('tab-All')).toBeInTheDocument();
    expect(screen.queryByTestId('filter-fields')).not.toBeInTheDocument();
  });

  it('renders both', () => {
    render(<FormToolbar showFilterField showSectionTabs />);

    expect(screen.getByTestId('filter-fields')).toBeInTheDocument();
    expect(screen.getByTestId('tab-Required')).toBeInTheDocument();
  });
});
