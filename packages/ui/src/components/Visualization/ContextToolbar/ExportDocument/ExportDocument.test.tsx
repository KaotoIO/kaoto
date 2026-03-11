import { VisualizationProvider } from '@patternfly/react-topology';
import { act, fireEvent, render, waitFor } from '@testing-library/react';

import { CamelResource, CamelRouteResource } from '../../../../models/camel';
import { EntityType } from '../../../../models/camel/entities';
import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { ExportDocument } from './ExportDocument';

describe('FlowExportDocument.tsx', () => {
  let camelResource: CamelResource;
  beforeEach(async () => {
    camelResource = new CamelRouteResource();
    camelResource.addNewEntity(EntityType.Route);
    camelResource.addNewEntity(EntityType.RouteConfiguration);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be render', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <VisualizationProvider controller={ControllerService.createController()}>
        <Provider>
          <ExportDocument />
        </Provider>
      </VisualizationProvider>,
    );

    const exportButton = wrapper.getByTestId('documentationPreviewButton');
    expect(exportButton).toBeInTheDocument();
    act(() => {
      fireEvent.click(exportButton);
    });

    const previewModal = wrapper.getByTestId('documentationPreviewModal');
    expect(previewModal).toBeInTheDocument();
    const dropdown = wrapper.getByTestId('entities-list-btn');
    act(() => {
      fireEvent.click(dropdown);
    });

    const showAllBtn = wrapper.getByTestId('toggle-btn-all-show');
    act(() => {
      fireEvent.click(showAllBtn);
    });

    await waitFor(async () => {
      const header = await wrapper.findByTestId('documentationPreviewModal');
      expect(header).toBeInTheDocument();
    });

    await waitFor(async () => {
      const tables = await wrapper.findAllByTestId('export-document-preview-body');
      expect(tables.length).toEqual(1);
    });
  });
});
