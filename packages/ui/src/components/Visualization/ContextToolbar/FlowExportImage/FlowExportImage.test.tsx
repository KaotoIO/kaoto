import { useVisualizationController } from '@patternfly/react-topology';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toBlob } from 'html-to-image';
import type { Mock } from 'vitest';

import { TestProvidersWrapper } from '../../../../stubs';
import { FlowExportImage } from './FlowExportImage';

vi.mock('html-to-image', async () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['fake-image-data'], { type: 'image/png' })),
}));
vi.mock('@patternfly/react-topology', async () => ({
  ...(await vi.importActual('@patternfly/react-topology')),
  useVisualizationController: vi.fn(),
  useEventListener: vi.fn(),
}));

globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
  cb(0);
  return 1;
}) as unknown as typeof globalThis.requestAnimationFrame;

HTMLAnchorElement.prototype.click = vi.fn();

URL.createObjectURL = vi.fn(() => 'blob:mock-url');
URL.revokeObjectURL = vi.fn();

const realQuerySelector: Document['querySelector'] = document.querySelector.bind(document);

type Position = { x: number; y: number };

interface MockGraph {
  reset: Mock<() => void>;
  fit: Mock<(padding: number) => void>;
  layout: Mock<() => void>;
  getScale: Mock<() => number>;
  getPosition: Mock<() => Position>;
  setScale: Mock<(scale: number) => void>;
  setPosition: Mock<(position: Position) => void>;
  getLayout: Mock<() => string>;
  getGraph: () => MockGraph;
}

describe('FlowExportImage', () => {
  let mockSurface: HTMLElement;
  let mockGraph: MockGraph;

  beforeEach(() => {
    mockSurface = document.createElement('div');
    mockSurface.className = 'pf-topology-visualization-surface';

    // Create mock SVG element with getBBox method
    const mockSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mockSvg.getBBox = vi.fn(() => ({ x: 0, y: 0, width: 100, height: 100 }) as DOMRect);
    mockSvg.setAttribute = vi.fn();
    mockSurface.appendChild(mockSvg);

    document.querySelector = vi.fn((selector?: string | null) => {
      if (selector === '.pf-topology-visualization-surface') return mockSurface;
      return realQuerySelector(selector ?? '');
    }) as unknown as typeof document.querySelector;

    mockGraph = {
      reset: vi.fn(),
      fit: vi.fn(),
      layout: vi.fn(),
      getScale: vi.fn(() => 1),
      getPosition: vi.fn(() => ({ x: 10, y: 20 })),
      setScale: vi.fn(),
      setPosition: vi.fn(),
      getLayout: vi.fn(() => 'DagreHorizontal'),
      getGraph() {
        return this;
      },
    };

    (useVisualizationController as Mock).mockReturnValue({
      getGraph: () => mockGraph,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the export button', () => {
    const { Provider } = TestProvidersWrapper();
    render(
      <Provider>
        <FlowExportImage />
      </Provider>,
    );
    expect(screen.getByTestId('exportImageButton')).toBeInTheDocument();
  });

  it('runs full export flow', async () => {
    const { Provider } = TestProvidersWrapper();
    render(
      <Provider>
        <FlowExportImage />
      </Provider>,
    );

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
    document.querySelector = vi.fn((selector?: string | null) => {
      if (selector === '.pf-topology-visualization-surface') return null;
      return realQuerySelector(selector ?? '');
    }) as unknown as typeof document.querySelector;

    const { Provider } = TestProvidersWrapper();
    render(
      <Provider>
        <FlowExportImage />
      </Provider>,
    );

    fireEvent.click(screen.getByTestId('exportImageButton'));

    // Wait a bit to ensure the export attempt completes
    await waitFor(() => {
      expect(toBlob).not.toHaveBeenCalled();
    });
  });
});
