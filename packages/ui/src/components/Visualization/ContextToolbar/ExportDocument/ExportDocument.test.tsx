import { CamelYamlDsl } from '@kaoto/camel-catalog/types';
import { VisualizationProvider } from '@patternfly/react-topology';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { parse } from 'yaml';

import { CamelRouteResource } from '../../../../models/camel';
import { EntityType } from '../../../../models/entities';
import { KaotoResource } from '../../../../models/kaoto-resource';
import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { ExportDocument } from './ExportDocument';

describe('FlowExportDocument.tsx', () => {
  let camelResource: KaotoResource;
  beforeEach(async () => {
    camelResource = new CamelRouteResource();
    camelResource.addNewEntity(EntityType.Route);
    camelResource.addNewEntity(EntityType.RouteConfiguration);
    // Materialize the new entities into source so the wrapper's re-initialize()
    // (which rebuilds entities from source) preserves them — mirrors how runtime
    // recreates the resource from serialized code on `code:updated`.
    camelResource = new CamelRouteResource(parse(await camelResource.toSourceCode()) as CamelYamlDsl);
  });

  afterEach(() => vi.clearAllMocks());

  it('should be render', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = await TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <VisualizationProvider controller={ControllerService.createController()}>
        <Provider>
          <ExportDocument />
        </Provider>
      </VisualizationProvider>,
    );

    const exportButton = wrapper.getByTestId('documentationPreviewButton');
    expect(exportButton).toBeInTheDocument();
    fireEvent.click(exportButton);

    const previewModal = wrapper.getByTestId('documentationPreviewModal');
    expect(previewModal).toBeInTheDocument();
    const dropdown = wrapper.getByTestId('entities-list-btn');
    fireEvent.click(dropdown);

    const showAllBtn = wrapper.getByTestId('toggle-btn-all-show');
    fireEvent.click(showAllBtn);

    await waitFor(async () => {
      const header = await wrapper.findByTestId('documentationPreviewModal');
      expect(header).toBeInTheDocument();
    });

    await waitFor(async () => {
      const tables = await wrapper.findAllByTestId('export-document-preview-body');
      expect(tables).toHaveLength(1);
    });
  });
});
