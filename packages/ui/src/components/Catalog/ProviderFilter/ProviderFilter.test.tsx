import { fireEvent, render, screen } from '@testing-library/react';

import { ProviderFilter } from './ProviderFilter';

describe('ProviderFilter', () => {
  const providers = ['Apache Camel', 'Red Hat'];

  it('lists the providers once the toggle is clicked', () => {
    render(<ProviderFilter providers={providers} selectedProviders={providers} onSelectProvider={vi.fn()} />);

    fireEvent.click(screen.getByTestId('provider-filter-toggle'));

    expect(screen.getByTestId('providers-select-item-Apache Camel')).toBeInTheDocument();
    expect(screen.getByTestId('providers-select-item-Red Hat')).toBeInTheDocument();
  });

  it('hides the providers when the toggle is clicked again', () => {
    render(<ProviderFilter providers={providers} selectedProviders={providers} onSelectProvider={vi.fn()} />);

    fireEvent.click(screen.getByTestId('provider-filter-toggle'));
    fireEvent.click(screen.getByTestId('provider-filter-toggle'));

    expect(screen.queryByTestId('providers-select-item-Red Hat')).not.toBeInTheDocument();
  });

  it('passes the clicked provider to onSelectProvider', () => {
    const onSelectProvider = vi.fn();
    render(<ProviderFilter providers={providers} selectedProviders={providers} onSelectProvider={onSelectProvider} />);

    fireEvent.click(screen.getByTestId('provider-filter-toggle'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Red Hat' }));

    expect(onSelectProvider).toHaveBeenCalledWith('Red Hat');
  });

  it('shows the number of selected providers on the toggle', () => {
    render(<ProviderFilter providers={providers} selectedProviders={['Red Hat']} onSelectProvider={vi.fn()} />);

    expect(screen.getByTestId('provider-filter-toggle')).toHaveTextContent('Provided by1');
  });
});
