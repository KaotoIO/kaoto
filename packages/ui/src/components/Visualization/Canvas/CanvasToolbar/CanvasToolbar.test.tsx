import {
  action,
  ElementContext,
  isNode,
  LayersProvider,
  Point,
  VisualizationProvider,
} from '@patternfly/react-topology';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { cloneDeep } from 'lodash';

import { NodeToolbarTrigger, SettingsModel } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { SettingsProvider } from '../../../../providers';
import { CanvasToolbarProvider } from '../../../../providers/canvas-toolbar.provider';
import { camelRouteJson, TestProvidersWrapper } from '../../../../stubs';
import { createRouteVisualizationController } from '../../../../stubs/route-visualization-controller';
import { CustomGroupExpanded } from '../../Custom/Group/CustomGroupExpanded';
import { CustomNodeObserver } from '../../Custom/Node/CustomNode';
import { CanvasDefaults } from '../canvas.defaults';
import { CanvasToolbar, getToolbarAnchor } from './CanvasToolbar';

describe('CanvasToolbar integration', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const setup = async () => {
    const resource = new CamelRouteResource([cloneDeep(camelRouteJson)]);
    const { Provider } = await TestProvidersWrapper({ camelResource: resource });
    const { controller } = await createRouteVisualizationController(resource);
    const nodes = controller.getElements().filter(isNode);
    const a = nodes.find((node) => node.getData()?.vizNode?.data.path === 'route.from.steps.0.set-header')!;
    const b = nodes.find((node) => node.getData()?.vizNode?.data.path === 'route.from.steps.1.choice')!;
    const collapse = vi.fn();
    const view = (selected?: string, trigger = NodeToolbarTrigger.onHover, showA = true) => (
      <Provider>
        <SettingsProvider
          adapter={{ getSettings: () => new SettingsModel({ nodeToolbarTrigger: trigger }), saveSettings: vi.fn() }}
        >
          <VisualizationProvider controller={controller}>
            <CanvasToolbarProvider>
              <svg>
                <LayersProvider layers={controller.getGraph().getLayers()}>
                  {showA && (
                    <ElementContext.Provider value={a}>
                      <CustomNodeObserver element={a} selected={selected === a.getId()} />
                    </ElementContext.Provider>
                  )}
                  <ElementContext.Provider value={b}>
                    <CustomGroupExpanded element={b} selected={selected === b.getId()} onCollapseToggle={collapse} />
                  </ElementContext.Provider>
                </LayersProvider>
                <CanvasToolbar />
              </svg>
            </CanvasToolbarProvider>
          </VisualizationProvider>
        </SettingsProvider>
      </Provider>
    );
    const rendered = render(view());
    await screen.findByTestId(`custom-node__${a.getData().vizNode.id}`);
    vi.useFakeTimers();
    return { ...rendered, view, a, b, controller, collapse };
  };

  it('shares one persistent toolbar between a step and a group and dispatches to the current target', async () => {
    const { a, b, collapse } = await setup();
    const step = screen.getByTestId(`custom-node__${a.getData().vizNode.id}`);
    const group = screen.getByTestId(`custom-group__${b.getData().vizNode.id}`);
    fireEvent.mouseEnter(step);
    await act(() => vi.advanceTimersByTime(200));
    const toolbar = screen.getByTestId('step-toolbar');
    expect(step).toHaveAttribute('data-toolbar-open', 'true');
    fireEvent.mouseLeave(step);
    fireEvent.mouseEnter(group);
    await act(() => vi.advanceTimersByTime(200));
    expect(screen.getAllByTestId('step-toolbar')).toHaveLength(1);
    expect(screen.getByTestId('step-toolbar')).toBe(toolbar);
    expect(toolbar.closest('foreignObject')).toHaveAttribute(
      'x',
      String(getToolbarAnchor(b).centerX - CanvasDefaults.STEP_TOOLBAR_WIDTH / 2 - 24),
    );
    await act(() => vi.runAllTimers());
    expect(toolbar).toBeVisible();
    expect(step).toHaveAttribute('data-toolbar-open', 'false');
    expect(group).toHaveAttribute('data-toolbar-open', 'true');
    fireEvent.click(screen.getByTitle('Collapse step'));
    expect(collapse).toHaveBeenCalledOnce();
  });

  it.each(['step', 'group'] as const)(
    'keeps a selected %s toolbar reachable on hover and dismisses it after leaving',
    async (kind) => {
      const { a, b, view, rerender } = await setup();
      const element = kind === 'step' ? a : b;
      const prefix = kind === 'step' ? 'custom-node' : 'custom-group';
      rerender(view(element.getId()));
      const target = screen.getByTestId(`${prefix}__${element.getData().vizNode.id}`);
      expect(screen.queryByTestId('step-toolbar')).not.toBeInTheDocument();
      fireEvent.mouseEnter(target);
      await act(() => vi.advanceTimersByTime(CanvasDefaults.TOOLBAR_HOVER_DELAY_MS));
      fireEvent.mouseLeave(target);
      await act(() => vi.advanceTimersByTime(100));
      fireEvent.mouseEnter(screen.getByTestId('step-toolbar'));
      await act(() => vi.runAllTimers());
      expect(screen.getByTestId('step-toolbar')).toBeVisible();
      fireEvent.mouseLeave(screen.getByTestId('step-toolbar'));
      await act(() => vi.runAllTimers());
      expect(screen.queryByTestId('step-toolbar')).not.toBeInTheDocument();
      expect(target).toHaveAttribute('data-toolbar-open', 'false');
    },
  );

  it('switches trigger mode, follows single selection and clears on deselection or target unmount', async () => {
    const { a, b, view, rerender } = await setup();
    rerender(view(a.getId()));
    expect(screen.queryByTestId('step-toolbar')).not.toBeInTheDocument();
    rerender(view(a.getId(), NodeToolbarTrigger.onSelection));
    const step = screen.getByTestId(`custom-node__${a.getData().vizNode.id}`);
    const group = screen.getByTestId(`custom-group__${b.getData().vizNode.id}`);
    fireEvent.mouseEnter(group);
    await act(() => vi.runAllTimers());
    expect(screen.getByTestId('step-toolbar')).toBeVisible();
    expect(step).toHaveAttribute('data-toolbar-open', 'true');
    expect(group).toHaveAttribute('data-toolbar-open', 'false');
    fireEvent.mouseLeave(group);
    rerender(view(b.getId(), NodeToolbarTrigger.onSelection));
    fireEvent.mouseEnter(step);
    await act(() => vi.runAllTimers());
    expect(step).toHaveAttribute('data-toolbar-open', 'false');
    expect(group).toHaveAttribute('data-toolbar-open', 'true');
    fireEvent.mouseLeave(step);
    expect(screen.getAllByTestId('step-toolbar')).toHaveLength(1);
    expect(screen.getByTitle('Collapse step')).toBeInTheDocument();
    rerender(view(undefined, NodeToolbarTrigger.onSelection));
    expect(screen.queryByTestId('step-toolbar')).not.toBeInTheDocument();
    rerender(view(a.getId(), NodeToolbarTrigger.onSelection));
    rerender(view(a.getId(), NodeToolbarTrigger.onSelection, false));
    expect(screen.queryByTestId('step-toolbar')).not.toBeInTheDocument();
  });

  it('tracks graph pan and zoom directly and calculates node and expanded-group anchors', async () => {
    const { a, b, controller, rerender, view } = await setup();
    rerender(view(a.getId(), NodeToolbarTrigger.onSelection));
    act(
      action(() => {
        controller.getGraph().setPosition(new Point(30, 50));
        controller.getGraph().setScale(1.5);
        a.setPosition(new Point(100, 200));
      }),
    );
    expect(screen.getByTestId('canvas-toolbar-layer')).toHaveAttribute('transform', 'translate(30, 50) scale(1.5)');
    const bounds = a.getBounds();
    expect(getToolbarAnchor(a)).toEqual({ centerX: bounds.x + bounds.width / 2, bottomY: bounds.y });
    const groupBounds = b.getBounds();
    expect(getToolbarAnchor(b)).toEqual({ centerX: groupBounds.x + groupBounds.width / 2, bottomY: groupBounds.y });
  });
});
