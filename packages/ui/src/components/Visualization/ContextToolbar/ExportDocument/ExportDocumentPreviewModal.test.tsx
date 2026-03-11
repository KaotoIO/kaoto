import { GRAPH_LAYOUT_END_EVENT, useEventListener, VisualizationProvider } from '@patternfly/react-topology';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toBlob } from 'html-to-image';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CamelRouteResource } from '../../../../models/camel';
import { DocumentationService } from '../../../../services/documentation.service';
import { camelRouteJson, TestProvidersWrapper } from '../../../../stubs';
import { CanvasNode } from '../../Canvas/canvas.models';
import { ControllerService } from '../../Canvas/controller.service';
import { FlowService } from '../../Canvas/flow.service';
import { ExportDocumentPreviewModal } from './ExportDocumentPreviewModal';

jest.mock('html-to-image', () => ({
  toBlob: jest.fn(),
}));

jest.mock('@patternfly/react-topology', () => ({
  ...jest.requireActual('@patternfly/react-topology'),
  useEventListener: jest.fn(),
  GRAPH_LAYOUT_END_EVENT: 'graph.layout.end',
}));

jest.mock('../../Canvas/flow.service');

describe('ExportDocumentPreviewModal', () => {
  const camelResource = new CamelRouteResource([camelRouteJson]);
  let onCloseSpy: jest.Mock;
  let wrapper: FunctionComponent<PropsWithChildren>;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let clickSpy: jest.SpyInstance;
  let eventListenerCallback: ((event?: Event) => void) | null = null;

  beforeEach(() => {
    onCloseSpy = jest.fn();

    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = jest.fn();

    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation();

    (FlowService.getFlowDiagram as jest.Mock).mockReturnValue({
      nodes: [{ id: 'node-1', type: 'node' } as CanvasNode],
      edges: [{ id: 'edge-1', type: 'edge' }],
    });

    (toBlob as jest.Mock).mockResolvedValue(new Blob(['fake-image-data'], { type: 'image/png' }));

    (useEventListener as jest.Mock).mockImplementation((eventType: string, callback: (event?: Event) => void) => {
      if (eventType === GRAPH_LAYOUT_END_EVENT) {
        eventListenerCallback = callback;
      }
    });

    const { Provider } = TestProvidersWrapper({ camelResource });
    wrapper = ({ children }) => (
      <VisualizationProvider controller={ControllerService.createController()}>
        <Provider>{children}</Provider>
      </VisualizationProvider>
    );
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    clickSpy.mockRestore();
    eventListenerCallback = null;
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
    const getDocumentationEntitiesSpy = jest.spyOn(DocumentationService, 'getDocumentationEntities');

    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    expect(getDocumentationEntitiesSpy).toHaveBeenCalledWith(camelResource, {});
  });

  it('creates blob URL and markdown when HiddenCanvas generates blob', async () => {
    const generateMarkdownSpy = jest.spyOn(DocumentationService, 'generateMarkdown');

    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    // Trigger the GRAPH_LAYOUT_END_EVENT to simulate canvas layout completion
    act(() => {
      eventListenerCallback?.();
    });

    await waitFor(() => {
      expect(URL.createObjectURL as jest.Mock).toHaveBeenCalled();
      expect(generateMarkdownSpy).toHaveBeenCalled();
    });
  });

  it('hides loading spinner after blob is generated', async () => {
    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    // Initially loading spinner should be visible
    expect(screen.getByLabelText('Loading markdown preview')).toBeInTheDocument();

    // Trigger the GRAPH_LAYOUT_END_EVENT to simulate canvas layout completion
    act(() => {
      eventListenerCallback?.();
    });

    // Wait for loading spinner to be removed
    await waitFor(() => {
      expect(screen.queryByLabelText('Loading markdown preview')).not.toBeInTheDocument();
    });
  });

  it('generates zip with blob and markdown when downloading', async () => {
    const generateDocumentationZipSpy = jest
      .spyOn(DocumentationService, 'generateDocumentationZip')
      .mockResolvedValue(new Blob(['fake-zip-data'], { type: 'application/zip' }));

    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    // Trigger blob generation
    act(() => {
      eventListenerCallback?.();
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
    jest
      .spyOn(DocumentationService, 'generateDocumentationZip')
      .mockResolvedValue(new Blob(['fake-zip-data'], { type: 'application/zip' }));

    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    // Change filename
    const input = screen.getByLabelText('Download File Name');
    await user.clear(input);
    await user.type(input, 'my-custom-export.zip');

    // Trigger blob generation
    act(() => {
      eventListenerCallback?.();
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
    jest.spyOn(DocumentationService, 'generateDocumentationZip').mockResolvedValue(zipBlob);

    render(<ExportDocumentPreviewModal onClose={onCloseSpy} />, { wrapper });

    // Trigger blob generation
    act(() => {
      eventListenerCallback?.();
    });

    await waitFor(() => {
      expect(screen.queryByLabelText('Loading markdown preview')).not.toBeInTheDocument();
    });

    // Clear previous calls to createObjectURL (from image blob)
    (URL.createObjectURL as jest.Mock).mockClear();

    // Click download button
    const downloadButton = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(URL.createObjectURL as jest.Mock).toHaveBeenCalledWith(zipBlob);
    });
  });
});
