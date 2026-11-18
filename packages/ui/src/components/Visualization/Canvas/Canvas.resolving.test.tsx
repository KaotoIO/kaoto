import { SELECTION_EVENT, VisualizationProvider } from '@patternfly/react-topology';
import { act, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';

import { CamelRouteVisualEntity } from '../../../models/visualization/flows';
import { TestProvidersWrapper } from '../../../stubs';
import { camelRouteJson } from '../../../stubs/camel-route';
import * as deleteHotkey from '../Custom/hooks/delete-hotkey.hook';
import { buildDesignerCanvasModel } from '../designer-canvas-model';
import { Canvas } from './Canvas';
import { ControllerService } from './controller.service';

describe('Canvas while the model resolves', () => {
  const entity = new CamelRouteVisualEntity(camelRouteJson);

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  async function setup() {
    const { Provider } = await TestProvidersWrapper();
    const controller = ControllerService.createController();
    const { nodes, edges } = buildDesignerCanvasModel([await entity.toVizNode()]);

    /*
     * Before the first resolve, DesignerVisualization passes an empty model flagged as resolving.
     * Canvas must not draw it.
     */
    const ui = ({ children, isModelResolving = false }: { children?: ReactNode; isModelResolving?: boolean } = {}) => (
      <Provider>
        <VisualizationProvider controller={controller}>
          <Canvas
            nodes={isModelResolving ? [] : nodes}
            edges={isModelResolving ? [] : edges}
            isModelResolving={isModelResolving}
          >
            {children}
          </Canvas>
        </VisualizationProvider>
      </Provider>
    );

    const flushFrames = () =>
      act(async () => {
        await vi.runAllTimersAsync();
      });

    return { controller, ui, flushFrames };
  }

  it('renders its children inside the canvas', async () => {
    const { ui, flushFrames } = await setup();

    render(ui({ children: <div data-testid="canvas-overlay" /> }));
    await flushFrames();

    expect(screen.getByLabelText('Route canvas')).toContainElement(screen.getByTestId('canvas-overlay'));
  });

  it('keeps the same canvas element mounted while the model resolves', async () => {
    const { controller, ui, flushFrames } = await setup();

    const { rerender } = render(ui());
    await flushFrames();
    const canvas = screen.getByLabelText('Route canvas');
    const elementsCount = controller.getElements().length;
    expect(elementsCount).toBeGreaterThan(0);

    rerender(ui({ isModelResolving: true }));
    await flushFrames();
    expect(screen.getByLabelText('Route canvas')).toBe(canvas);
    expect(controller.getElements()).toHaveLength(elementsCount);

    rerender(ui());
    await flushFrames();
    expect(screen.getByLabelText('Route canvas')).toBe(canvas);
  });

  it('turns the Delete hotkey off while the model resolves', async () => {
    const { controller, ui, flushFrames } = await setup();
    /* Keeps the real implementation, but records the calls */
    const hotkeyMock = vi.spyOn(deleteHotkey, 'default');

    const selectRouteFrom = async () => {
      await act(async () => {
        controller.fireEvent(SELECTION_EVENT, ['route-8888|route.from']);
        await vi.runAllTimersAsync();
      });
      expect(hotkeyMock.mock.lastCall?.[0]).toBeDefined();
    };

    const { rerender } = render(ui());
    await flushFrames();
    await selectRouteFrom();

    rerender(ui({ isModelResolving: true }));
    expect(hotkeyMock.mock.lastCall?.[0]).toBeUndefined();

    /* Redrawing the resolved model resets the selection, so select again */
    rerender(ui());
    await flushFrames();
    await selectRouteFrom();
  });
});
