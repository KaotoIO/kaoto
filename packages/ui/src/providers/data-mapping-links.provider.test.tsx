import { render, screen } from '@testing-library/react';

import { MappingLinksProvider } from './data-mapping-links.provider';
import { DataMapperProvider } from './datamapper.provider';

describe('DataMappingLinksProvider', () => {
  it('should render', async () => {
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <div data-testid="testdiv" />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('testdiv')).toBeInTheDocument();
  });

  it('should fail if not within DataMapperProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const thrower = () => {
      render(<MappingLinksProvider></MappingLinksProvider>);
    };
    expect(thrower).toThrow();
    consoleSpy.mockRestore();
  });
});
