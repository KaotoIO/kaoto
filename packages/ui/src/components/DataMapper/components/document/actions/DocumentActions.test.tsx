import { DocumentActions } from './DocumentActions';
import { render, screen } from '@testing-library/react';
import { DocumentNodeData } from '../../../models/visualization';
import { TestUtil } from '../../../test/test-util';
import { DataMapperProvider } from '../../../providers';
import { CanvasProvider } from '../../../providers/CanvasProvider';

describe('DocumentActions', () => {
  it('should render', async () => {
    const docData = new DocumentNodeData(TestUtil.createSourceOrderDoc());
    render(
      <DataMapperProvider>
        <CanvasProvider>
          <DocumentActions nodeData={docData} />
        </CanvasProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('attach-schema-sourceBody-ShipOrder.xsd-button'));
  });
});
