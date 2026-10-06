import { VisualizationProvider } from '@patternfly/react-topology';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';

import { CamelRouteVisualEntity } from '../../../models/visualization/flows';
import { createOverlayStore } from '../../../store/overlay.store';
import { TestProvidersWrapper } from '../../../stubs';
import { camelRouteJson } from '../../../stubs/camel-route';
import { buildDesignerCanvasModel } from '../designer-canvas-model';
import { buildDesignerOverlayTargetSnapshot } from '../Overlay/designer-overlay-targets';
import { OverlayEntry } from '../Overlay/overlay-entries';
import { CanvasOverlaySource } from '../Overlay/use-canvas-overlays';
import { Canvas } from './Canvas';
import { CanvasNodesAndEdges } from './canvas.models';
import { ControllerService } from './controller.service';

const scope = { canvasId: 'canvas', documentId: 'routes.yaml', modelRevision: '1' };

it('renders from the store without writing graph data; metric updates preserve layout and selection', async () => {
  const { Provider } = await TestProvidersWrapper();
  const entity = new CamelRouteVisualEntity(structuredClone(camelRouteJson));
  const vizNode = await entity.toVizNode();
  const model = buildDesignerCanvasModel([vizNode]);
  const step = model.nodes.find((node) => node.data?.vizNode?.data.path === 'route.from')!;
  const edge = model.edges.find((item) =>
    model.nodes.find((node) => node.id === item.target && !node.data?.vizNode?.data.isPlaceholder),
  )!;
  const store = createOverlayStore(buildDesignerOverlayTargetSnapshot(scope, model, [{ id: entity.id }]));
  const owner = store.getState().createOwner()!;
  const source: CanvasOverlaySource = { model, store };
  const note = (id: string, target: OverlayEntry['target'], value: number): OverlayEntry => ({
    id,
    kind: 'annotation',
    target,
    text: id,
    value,
    interaction: { accessibleLabel: id, tooltip: 'Metric details' },
  });
  owner.replaceLayer(scope, 'trace', [
    note('Step count', { kind: 'node', id: step.id }, 42),
    note('Edge count', { kind: 'edge', id: edge.id }, 42),
    note('Route count', { kind: 'route', id: entity.id }, 42),
    { id: 'step-path', kind: 'highlight', target: { kind: 'node', id: step.id } },
    { id: 'edge-path', kind: 'highlight', target: { kind: 'edge', id: edge.id } },
  ]);
  const controller = ControllerService.createController();
  // jsdom has no viewport dimensions; keep real node renderers mounted.
  controller.setRenderConstraint(false);
  let replaceModel: (model: CanvasNodesAndEdges) => void = () => {};
  let replaceSource: (source: CanvasOverlaySource) => void = () => {};
  let enableCollapseUpdates: () => void = () => {};
  const Content = () => {
    const [applyCollapse, setApplyCollapse] = useState(false);
    enableCollapseUpdates = () => {
      setApplyCollapse(true);
    };
    const [current, setCurrent] = useState(model);
    const [currentSource, setSource] = useState(source);
    replaceModel = setCurrent;
    replaceSource = setSource;
    return (
      <VisualizationProvider controller={controller}>
        <Canvas {...current} overlaySource={currentSource} applyCollapseOnUpdate={applyCollapse} />
      </VisualizationProvider>
    );
  };
  const originalDefinition = JSON.stringify(entity.toJSON());
  const { unmount } = render(
    <Provider>
      <Content />
    </Provider>,
  );
  const stepElement = await screen.findByTestId(`custom-node__${step.data!.vizNode!.id}`);
  expect(within(stepElement).getByRole('button', { name: 'Step count: Step count 42' })).toBeInTheDocument();
  expect(stepElement.querySelector('rect.kaoto-overlay')).toBeInTheDocument();
  const edgeNote = screen.getByRole('button', { name: 'Edge count: Edge count 42' });
  expect(edgeNote.closest('.custom-edge')?.querySelector('path.kaoto-overlay')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Route count: Route count 42' }).closest('.custom-group'),
  ).toBeInTheDocument();
  fireEvent.click(stepElement);
  expect(stepElement).toHaveAttribute('data-selected', 'true');
  const layout = vi.spyOn(controller.getGraph(), 'layout');
  const fromModel = vi.spyOn(controller, 'fromModel');
  const oldStep = controller.getElementById(step.id);
  const graphData = controller.getElements().map((element) => ({ element, data: element.getData() }));
  const setData = graphData.map(({ element }) => vi.spyOn(element, 'setData'));
  act(() => {
    owner.upsertEntries(scope, 'trace', [note('Step count', { kind: 'node', id: step.id }, 43)]);
  });
  expect(screen.getByRole('button', { name: 'Step count: Step count 43' })).toBeInTheDocument();
  expect(stepElement).toHaveAttribute('data-selected', 'true');
  expect(controller.getElementById(step.id)).toBe(oldStep);
  expect(layout).not.toHaveBeenCalled();
  expect(fromModel).not.toHaveBeenCalled();
  for (const spy of setData) expect(spy).not.toHaveBeenCalled();
  for (const { element, data } of graphData) {
    expect(element.getData()).toBe(data);
    expect(element.getData()?.overlays).toBeUndefined();
  }
  expect(JSON.stringify(entity.toJSON())).toBe(originalDefinition);
  act(() => {
    enableCollapseUpdates();
  });
  expect(screen.getByRole('button', { name: 'Step count: Step count 43' })).toBeInTheDocument();
  const nextModel = { nodes: [...model.nodes], edges: [...model.edges] };
  act(() => {
    replaceModel(nextModel);
  });
  expect(screen.queryByRole('button', { name: /Step count:/ })).not.toBeInTheDocument();
  act(() => {
    owner.upsertEntries(scope, 'trace', [note('Step count', { kind: 'node', id: step.id }, 99)]);
  });
  expect(screen.queryByRole('button', { name: /Step count:/ })).not.toBeInTheDocument();
  const nextScope = { ...scope, modelRevision: '2' };
  const nextStore = createOverlayStore(buildDesignerOverlayTargetSnapshot(nextScope, nextModel, [{ id: entity.id }]));
  nextStore
    .getState()
    .createOwner()!
    .replaceLayer(nextScope, 'trace', [note('Step count', { kind: 'node', id: step.id }, 100)]);
  act(() => {
    replaceSource({ model: nextModel, store: nextStore });
  });
  expect(screen.getByRole('button', { name: 'Step count: Step count 100' })).toBeInTheDocument();
  act(() => {
    nextStore.getState().dispose();
  });
  expect(screen.queryByRole('button', { name: /Step count:/ })).not.toBeInTheDocument();
  unmount();
});
