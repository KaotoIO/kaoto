import { render, screen } from '@testing-library/react';

import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { SourcePanel } from './SourcePanel';

describe('SourcePanel', () => {
  it('should render action buttons by default', () => {
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <SourcePanel></SourcePanel>
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    expect(screen.getByTestId('add-parameter-button')).toBeInTheDocument();
    expect(screen.getByTestId('attach-schema-sourceBody-Body-button')).toBeInTheDocument();
    expect(screen.getByTestId('detach-schema-sourceBody-Body-button')).toBeInTheDocument();
  });
  it('should not render action buttons if isReadOnly=true', () => {
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <SourcePanel isReadOnly={true}></SourcePanel>
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    expect(screen.queryByTestId('add-parameter-button')).toBeFalsy();
    expect(screen.queryByTestId('attach-schema-sourceBody-Body-button')).toBeFalsy();
    expect(screen.queryByTestId('detach-schema-sourceBody-Body-button')).toBeFalsy();
  });
});
