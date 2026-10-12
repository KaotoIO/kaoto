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
import { camelRouteJson, TestProvidersWrapper } from '../../../../stubs';
import { createRouteVisualizationController } from '../../../../stubs/route-visualization-controller';
import { CustomGroupExpanded } from '../../Custom/Group/CustomGroupExpanded';
import { CustomNodeObserver } from '../../Custom/Node/CustomNode';
import { CanvasDefaults } from '../canvas.defaults';
import { CanvasToolbar, getToolbarAnchor } from './CanvasToolbar';
import { CanvasToolbarProvider } from './CanvasToolbarProvider';

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
    const outgoing = screen.getByTestId('canvas-toolbar-outgoing');
    const incoming = screen.getByTestId('canvas-toolbar-active');
    expect(outgoing).not.toBeEmptyDOMElement();
    expect(outgoing).toHaveAttribute('aria-hidden', 'true');
    expect(incoming).toHaveAttribute('opacity', '0');
    expect(toolbar.closest('foreignObject')).toHaveAttribute(
      'x',
      String(getToolbarAnchor(b).centerX - CanvasDefaults.STEP_TOOLBAR_WIDTH / 2 - 24),
    );
    await act(() => vi.advanceTimersByTime(80));
    expect(Number(incoming.getAttribute('opacity'))).toBeGreaterThan(0);
    expect(Number(incoming.getAttribute('opacity'))).toBeLessThan(1);
    expect(Number(outgoing.getAttribute('opacity'))).toBeGreaterThan(0);
    expect(Number(outgoing.getAttribute('opacity'))).toBeLessThan(1);
    await act(() => vi.advanceTimersByTime(100));
    expect(outgoing).toBeEmptyDOMElement();
    expect(incoming).toHaveAttribute('opacity', '1');
    expect(step).toHaveAttribute('data-toolbar-open', 'false');
    expect(group).toHaveAttribute('data-toolbar-open', 'true');
    fireEvent.click(screen.getByTitle('Collapse step'));
    expect(collapse).toHaveBeenCalledOnce();
  });

  it('keeps the toolbar reachable across the gap and hides after leaving it', async () => {
    const { a } = await setup();
    const step = screen.getByTestId(`custom-node__${a.getData().vizNode.id}`);
    fireEvent.mouseEnter(step);
    await act(() => vi.advanceTimersByTime(200));
    fireEvent.mouseLeave(step);
    await act(() => vi.advanceTimersByTime(100));
    fireEvent.mouseEnter(screen.getByTestId('step-toolbar'));
    await act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId('step-toolbar')).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByTestId('step-toolbar'));
    await act(() => vi.advanceTimersByTime(250));
    expect(screen.queryByTestId('step-toolbar')).not.toBeInTheDocument();
  });

  it('switches trigger mode, follows single selection and clears on deselection or target unmount', async () => {
    const { a, b, view, rerender } = await setup();
    rerender(view(a.getId()));
    expect(screen.queryByTestId('step-toolbar')).not.toBeInTheDocument();
    rerender(view(a.getId(), NodeToolbarTrigger.onSelection));
    expect(screen.getByTestId('step-toolbar')).toBeInTheDocument();
    rerender(view(b.getId(), NodeToolbarTrigger.onSelection));
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
