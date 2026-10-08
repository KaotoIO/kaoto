import { GRAPH_LAYOUT_END_EVENT, Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toBlob } from 'html-to-image';

import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { FlowExportImage } from './FlowExportImage';

describe('FlowExportImage', () => {
  /** The controller of the canvas hosting the export button */
  let controller: Visualization;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  const renderExportImage = async () => {
    const { Provider } = await TestProvidersWrapper();
    render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <FlowExportImage />
        </VisualizationProvider>
      </Provider>,
    );
  };

  /** Notifies the end of the graph layout, so the hidden canvas exports the image */
  const fireLayoutEnd = () => {
    act(() => {
      controller.fireEvent(GRAPH_LAYOUT_END_EVENT, { graph: controller.getGraph() });
    });
  };

  beforeEach(async () => {
    controller = ControllerService.createController();

    /* jsdom has no SVG layout nor blob URLs, and can't download files */
    vi.spyOn(SVGSVGElement.prototype, 'getBBox').mockReturnValue(new DOMRect(0, 0, 100, 100));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.clearAllMocks();
  });

  it('renders the export button', async () => {
    await renderExportImage();
    expect(screen.getByTestId('exportImageButton')).toBeInTheDocument();
  });

  it('runs full export flow', async () => {
    await renderExportImage();

    const button = screen.getByTestId('exportImageButton');
    fireEvent.click(button);

    // Button should be disabled while exporting
    expect(button).toBeDisabled();

    fireLayoutEnd();

    await waitFor(
      () => {
        expect(toBlob).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );

    // After export completes, button should be enabled again
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('handles missing surface safely', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const realQuerySelector = Element.prototype.querySelector;
    vi.spyOn(Element.prototype, 'querySelector').mockImplementation(function (this: Element, selector: string) {
      if (selector === '.pf-topology-visualization-surface') return null;
      return realQuerySelector.call(this, selector);
    });

    await renderExportImage();

    const button = screen.getByTestId('exportImageButton');
    fireEvent.click(button);
    fireLayoutEnd();

    // Wait a bit to ensure the export attempt completes
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
    expect(console.error).toHaveBeenCalledWith('Surface not found');
    expect(toBlob).not.toHaveBeenCalled();
  });
});
