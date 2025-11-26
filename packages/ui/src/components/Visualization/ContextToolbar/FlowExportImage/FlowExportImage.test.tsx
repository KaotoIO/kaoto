import { useVisualizationController } from '@patternfly/react-topology';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toPng } from 'html-to-image';
import { PropsWithChildren } from 'react';

import { SourceCodeProvider } from '../../../../providers/source-code.provider';
import { FlowExportImage } from './FlowExportImage';

jest.mock('html-to-image', () => ({
  toPng: jest.fn().mockResolvedValue('data:image/png;base64'),
}));

jest.mock('@patternfly/react-topology', () => ({
  ...jest.requireActual('@patternfly/react-topology'),
  useVisualizationController: jest.fn(),
}));

globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
  cb(0);
  return 1;
}) as unknown as typeof globalThis.requestAnimationFrame;

HTMLAnchorElement.prototype.click = jest.fn();

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
  getGraph: () => MockGraph;
}

const wrapper = ({ children }: PropsWithChildren) => <SourceCodeProvider>{children}</SourceCodeProvider>;

describe('FlowExportImage', () => {
  let mockSurface: HTMLElement;
  let mockGraph: MockGraph;

  beforeEach(() => {
    mockSurface = document.createElement('div');
    mockSurface.className = 'pf-topology-container';

    document.querySelector = jest.fn((selector?: string | null) => {
      if (selector === '.pf-topology-container') return mockSurface;
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

  it('runs full export flow and resets graph', async () => {
    render(<FlowExportImage />, { wrapper });

    fireEvent.click(screen.getByTestId('exportImageButton'));

    expect(document.querySelector('.export-overlay')).not.toBeNull();

    await waitFor(() => {
      expect(toPng).toHaveBeenCalled();
    });

    expect(mockGraph.reset).toHaveBeenCalled();
    expect(mockGraph.fit).toHaveBeenCalledWith(80);
    expect(mockGraph.layout).toHaveBeenCalledTimes(2);

    expect(mockGraph.setScale).toHaveBeenCalledWith(1);
    expect(mockGraph.setPosition).toHaveBeenCalledWith(
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    );

    await waitFor(() => expect(document.querySelector('.export-overlay')).toBeNull());
  });

  it('handles missing container safely', async () => {
    document.querySelector = jest.fn((selector?: string | null) => {
      if (selector === '.pf-topology-container') return null;
      return realQuerySelector(selector ?? '');
    }) as unknown as typeof document.querySelector;

    render(<FlowExportImage />, { wrapper });

    fireEvent.click(screen.getByTestId('exportImageButton'));

    expect(toPng).not.toHaveBeenCalled();
    expect(mockGraph.reset).not.toHaveBeenCalled();
  });
});
