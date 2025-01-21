import { render } from '@testing-library/react';
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

  it('should be render', () => {
    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <ExportDocument />
      </Provider>,
    );

    const exportButton = wrapper.getByTestId('documentationPreviewButton');

    expect(exportButton).toBeInTheDocument();
  });
});
