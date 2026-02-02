import { render, screen } from '@testing-library/react';

import { DocumentNodeData } from '../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { DocumentActions } from './DocumentActions';

describe('DocumentActions', () => {
  it('should render', async () => {
    const docData = new DocumentNodeData(TestUtil.createSourceOrderDoc());
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <DocumentActions nodeData={docData} onRenameClick={jest.fn()} />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('attach-schema-sourceBody-Body-button'));
  });

  it('should render for Parameters', async () => {
    const docData = new DocumentNodeData(TestUtil.createParamOrderDoc('testparam1'));
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <DocumentActions nodeData={docData} onRenameClick={jest.fn()} />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('attach-schema-param-testparam1-button'));
    expect(await screen.findByTestId('detach-schema-param-testparam1-button'));
    expect(await screen.findByTestId('rename-parameter-testparam1-button'));
    expect(await screen.findByTestId('delete-parameter-testparam1-button'));
  });
});
