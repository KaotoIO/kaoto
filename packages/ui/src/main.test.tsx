import { render } from '@testing-library/react';
import { DataMapperProvider } from './providers';
import { CanvasProvider } from './providers/CanvasProvider';
import { DataMapper } from './DataMapper';

describe('main.tsx', () => {
  it('should render the initial screen', () => {
    render(
      <DataMapperProvider>
        <CanvasProvider>
          <DataMapper />
        </CanvasProvider>
      </DataMapperProvider>,
    );
  });
});
