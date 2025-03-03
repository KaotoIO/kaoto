import { act, fireEvent, render } from '@testing-library/react';
import { ExportDocument } from './ExportDocument';
import { TestProvidersWrapper } from '../../../../stubs';
import { EntityType } from '../../../../models/camel/entities';
import { CamelResource, CamelRouteResource } from '../../../../models/camel';

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
      <Provider>
        <ExportDocument />
      </Provider>,
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

    const headers = await wrapper.findAllByTestId('export-document-preview-h1');
    expect(headers.length).toEqual(3);
    const tables = await wrapper.findAllByTestId('export-document-preview-table');
    expect(tables.length).toEqual(1);
  });
});
