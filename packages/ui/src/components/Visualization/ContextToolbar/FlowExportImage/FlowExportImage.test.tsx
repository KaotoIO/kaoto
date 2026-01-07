import { useVisualizationController } from '@patternfly/react-topology';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toBlob } from 'html-to-image';
import { PropsWithChildren } from 'react';

import { EntitiesProvider } from '../../../../providers/entities.provider';
import { SourceCodeProvider } from '../../../../providers/source-code.provider';
import { VisibleFlowsProvider } from '../../../../providers/visible-flows.provider';
import { FlowExportImage } from './FlowExportImage';

jest.mock('html-to-image', () => ({
  toBlob: jest.fn().mockResolvedValue(new Blob(['fake-image-data'], { type: 'image/png' })),
}));

jest.mock('@patternfly/react-topology', () => ({
  ...jest.requireActual('@patternfly/react-topology'),
  useVisualizationController: jest.fn(),
  useEventListener: jest.fn(),
}));

globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
  cb(0);
  return 1;
}) as unknown as typeof globalThis.requestAnimationFrame;

HTMLAnchorElement.prototype.click = jest.fn();

URL.createObjectURL = jest.fn(() => 'blob:mock-url');
URL.revokeObjectURL = jest.fn();

const realQuerySelector: Document['querySelector'] = document.querySelector.bind(document);

type Position = { x: number; y: number };

interface MockGraph {
  reset: jest.Mock<void, []>;
  fit: jest.Mock<void, [number]>;
  layout: jest.Mock<void, []>;
  getScale: jest.Mock<number, []>;
  getPosition: jest.Mock<Position, []>;
  setScale: jest.Mock<void, [number]>;
  setPosition: jest.Mock<void, [Position]>;
  getLayout: jest.Mock<string, []>;
  getGraph: () => MockGraph;
}

const wrapper = ({ children }: PropsWithChildren) => (
  <SourceCodeProvider>
    <EntitiesProvider>
      <VisibleFlowsProvider>{children}</VisibleFlowsProvider>
    </EntitiesProvider>
  </SourceCodeProvider>
);

describe('FlowExportImage', () => {
  let mockSurface: HTMLElement;
  let mockGraph: MockGraph;

  beforeEach(() => {
    mockSurface = document.createElement('div');
    mockSurface.className = 'pf-topology-visualization-surface';

    // Create mock SVG element with getBBox method
    const mockSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mockSvg.getBBox = jest.fn(() => ({ x: 0, y: 0, width: 100, height: 100 }) as DOMRect);
    mockSvg.setAttribute = jest.fn();
    mockSurface.appendChild(mockSvg);

    document.querySelector = jest.fn((selector?: string | null) => {
      if (selector === '.pf-topology-visualization-surface') return mockSurface;
      return realQuerySelector(selector ?? '');
    }) as unknown as typeof document.querySelector;

    mockGraph = {
      reset: jest.fn(),
      fit: jest.fn(),
      layout: jest.fn(),
      getScale: jest.fn(() => 1),
      getPosition: jest.fn(() => ({ x: 10, y: 20 })),
      setScale: jest.fn(),
      setPosition: jest.fn(),
      getLayout: jest.fn(() => 'DagreHorizontal'),
      getGraph() {
        return this;
      },
    };

    (useVisualizationController as jest.Mock).mockReturnValue({
      getGraph: () => mockGraph,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the export button', () => {
    render(<FlowExportImage />, { wrapper });
    expect(screen.getByTestId('exportImageButton')).toBeInTheDocument();
  });

  it('runs full export flow', async () => {
    render(<FlowExportImage />, { wrapper });

    const button = screen.getByTestId('exportImageButton');
    fireEvent.click(button);

    // Button should be disabled while exporting
    expect(button).toBeDisabled();

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
    document.querySelector = jest.fn((selector?: string | null) => {
      if (selector === '.pf-topology-visualization-surface') return null;
      return realQuerySelector(selector ?? '');
    }) as unknown as typeof document.querySelector;

    render(<FlowExportImage />, { wrapper });

    fireEvent.click(screen.getByTestId('exportImageButton'));

    // Wait a bit to ensure the export attempt completes
    await waitFor(() => {
      expect(toBlob).not.toHaveBeenCalled();
    });
  });
});
