import { DocumentActions } from './DocumentActions';
import { render, screen } from '@testing-library/react';
import { DocumentNodeData } from '../../../models/datamapper/visualization';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';

describe('DocumentActions', () => {
  it('should render', async () => {
    const docData = new DocumentNodeData(TestUtil.createSourceOrderDoc());
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <DocumentActions nodeData={docData} onRenameClick={jest.fn()} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('attach-schema-sourceBody-ShipOrder.xsd-button'));
  });
});
