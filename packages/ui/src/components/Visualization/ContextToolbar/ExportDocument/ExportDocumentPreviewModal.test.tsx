import { GRAPH_LAYOUT_END_EVENT, Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toBlob } from 'html-to-image';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { Mock, MockInstance } from 'vitest';

import { CamelRouteResource } from '../../../../models/camel';
import { DocumentationService } from '../../../../services/documentation.service';
import { camelRouteJson, TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { ExportDocumentPreviewModal } from './ExportDocumentPreviewModal';

describe('ExportDocumentPreviewModal', () => {
  const camelResource = new CamelRouteResource([camelRouteJson]);
  let onCloseSpy: Mock;
  let wrapper: FunctionComponent<PropsWithChildren>;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let clickSpy: MockInstance;
  /** The controller of the canvas hosting the modal, where the hidden canvas listens for the layout end */
  let controller: Visualization;

  /** Notifies the end of the graph layout, so the hidden canvas generates the image */
  const fireLayoutEnd = () => {
    controller.fireEvent(GRAPH_LAYOUT_END_EVENT, { graph: controller.getGraph() });
  };

  beforeAll(async () => {
    await camelResource.initialize();
  });

  beforeEach(async () => {
    onCloseSpy = vi.fn();

    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();

    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    vi.mocked(toBlob).mockResolvedValue(new Blob(['fake-image-data'], { type: 'image/png' }));
    /* jsdom has no SVG layout, give the exported <svg> a size */
    vi.spyOn(SVGSVGElement.prototype, 'getBBox').mockReturnValue(new DOMRect(0, 0, 100, 100));

    controller = ControllerService.createController();
    const { Provider } = await TestProvidersWrapper({ camelResource });
    wrapper = ({ children }) => (
      <VisualizationProvider controller={controller}>
        <Provider>{children}</Provider>
      </VisualizationProvider>
    );
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    clickSpy.mockRestore();
  });

  it('renders the top toolbar', () => {
    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    expect(screen.getByLabelText('Generate Route Documentation')).toBeInTheDocument();
    expect(screen.getByTestId('entities-list-dropdown')).toBeInTheDocument();

    const input = screen.getByLabelText('Download File Name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('route-export.zip');

    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    expect(screen.getByLabelText('Loading markdown preview')).toBeInTheDocument();
  });

  it('calls onClose when modal is closed', async () => {
    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });

  it('updates download file name when input changes', async () => {
    const user = userEvent.setup();
    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    const input = screen.getByLabelText('Download File Name');
    await user.clear(input);
    await user.type(input, 'custom-export.zip');

    expect(input).toHaveValue('custom-export.zip');
  });

  it('initializes with documentation entities from DocumentationService', () => {
    const getDocumentationEntitiesSpy = vi.spyOn(DocumentationService, 'getDocumentationEntities');

    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    expect(getDocumentationEntitiesSpy).toHaveBeenCalledWith(camelResource, {});
  });

  it('creates blob URL and markdown when HiddenCanvas generates blob', async () => {
    const generateMarkdownSpy = vi.spyOn(DocumentationService, 'generateMarkdown');

    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    // Trigger the GRAPH_LAYOUT_END_EVENT to simulate canvas layout completion
    act(() => {
      fireLayoutEnd();
    });

    await waitFor(() => {
      expect(vi.mocked(URL.createObjectURL)).toHaveBeenCalled();
      expect(generateMarkdownSpy).toHaveBeenCalled();
    });
  });

  it('hides loading spinner after blob is generated', async () => {
    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    // Initially loading spinner should be visible
    expect(screen.getByLabelText('Loading markdown preview')).toBeInTheDocument();

    // Trigger the GRAPH_LAYOUT_END_EVENT to simulate canvas layout completion
    act(() => {
      fireLayoutEnd();
    });

    // Wait for loading spinner to be removed
    await waitFor(() => {
      expect(screen.queryByLabelText('Loading markdown preview')).not.toBeInTheDocument();
    });
  });

  it('generates zip with blob and markdown when downloading', async () => {
    const generateDocumentationZipSpy = vi
      .spyOn(DocumentationService, 'generateDocumentationZip')
      .mockResolvedValue(new Blob(['fake-zip-data'], { type: 'application/zip' }));

    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    // Trigger blob generation
    act(() => {
      fireLayoutEnd();
    });

    // Wait for blob to be generated
    await waitFor(() => {
      expect(screen.queryByLabelText('Loading markdown preview')).not.toBeInTheDocument();
    });

    // Click download button
    const downloadButton = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(generateDocumentationZipSpy).toHaveBeenCalledWith(expect.any(Blob), expect.any(String), 'route-export');
    });

    generateDocumentationZipSpy.mockRestore();
  });

  it('creates download link with correct filename', async () => {
    const user = userEvent.setup();
    vi.spyOn(DocumentationService, 'generateDocumentationZip').mockResolvedValue(
      new Blob(['fake-zip-data'], { type: 'application/zip' }),
    );

    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    // Change filename
    const input = screen.getByLabelText('Download File Name');
    await user.clear(input);
    await user.type(input, 'my-custom-export.zip');

    // Trigger blob generation
    act(() => {
      fireLayoutEnd();
    });

    await waitFor(() => {
      expect(screen.queryByLabelText('Loading markdown preview')).not.toBeInTheDocument();
    });

    // Click download button
    const downloadButton = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
    });

    // Verify the download attribute was set correctly
    const downloadLink = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(downloadLink.download).toBe('my-custom-export.zip');
  });

  it('creates blob URL for zip download', async () => {
    const zipBlob = new Blob(['fake-zip-data'], { type: 'application/zip' });
    vi.spyOn(DocumentationService, 'generateDocumentationZip').mockResolvedValue(zipBlob);

    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    // Trigger blob generation
    act(() => {
      fireLayoutEnd();
    });

    await waitFor(() => {
      expect(screen.queryByLabelText('Loading markdown preview')).not.toBeInTheDocument();
    });

    // Clear previous calls to createObjectURL (from image blob)
    vi.mocked(URL.createObjectURL).mockClear();

    // Click download button
    const downloadButton = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(vi.mocked(URL.createObjectURL)).toHaveBeenCalledWith(zipBlob);
    });
  });
});
