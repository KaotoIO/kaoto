import { renderHook, waitFor } from '@testing-library/react';

import { BaseVisualEntity, IVisualizationNode } from '../models/visualization/base-visual-entity';
import { IVisibleFlows } from '../utils/init-visible-flows';
import { useVisibleVizNodes } from './use-visible-viz-nodes';

function mockEntity(id: string, vizNode: IVisualizationNode): BaseVisualEntity {
  return {
    id,
    toVizNode: jest.fn().mockResolvedValue(vizNode),
  } as unknown as BaseVisualEntity;
}

describe('useVisibleVizNodes', () => {
  const nodeA = { id: 'viz-a' } as IVisualizationNode;
  const nodeB = { id: 'viz-b' } as IVisualizationNode;

  it('starts with an empty list and isResolving true before async resolution', () => {
    const entity = mockEntity('e1', nodeA);
    const entities = [entity];
    const visibleFlows: IVisibleFlows = { e1: true };
    const { result } = renderHook(() => useVisibleVizNodes(entities, visibleFlows));
    expect(result.current.vizNodes).toEqual([]);
    expect(result.current.isResolving).toBe(true);
  });

  it('resolves to viz nodes for entities that are visible in visibleFlows', async () => {
    const e1 = mockEntity('e1', nodeA);
    const e2 = mockEntity('e2', nodeB);
    const entities = [e1, e2];
    const visibleFlows: IVisibleFlows = { e1: true, e2: true };

    const { result } = renderHook(() => useVisibleVizNodes(entities, visibleFlows));

    await waitFor(() => {
      expect(result.current.vizNodes).toEqual([nodeA, nodeB]);
    });
    expect(result.current.isResolving).toBe(false);
    expect(e1.toVizNode).toHaveBeenCalled();
    expect(e2.toVizNode).toHaveBeenCalled();
  });

  it('skips entities that are not visible', async () => {
    const e1 = mockEntity('e1', nodeA);
    const e2 = mockEntity('e2', nodeB);
    const entities = [e1, e2];
    const visibleFlows: IVisibleFlows = { e1: true, e2: false };

    const { result } = renderHook(() => useVisibleVizNodes(entities, visibleFlows));

    await waitFor(() => {
      expect(result.current.vizNodes).toEqual([nodeA]);
    });
    expect(result.current.isResolving).toBe(false);
    expect(e1.toVizNode).toHaveBeenCalled();
    expect(e2.toVizNode).not.toHaveBeenCalled();
  });

  it('updates when visibleFlows changes', async () => {
    const e1 = mockEntity('e1', nodeA);
    const e2 = mockEntity('e2', nodeB);

    const { result, rerender } = renderHook(
      ({ entities, visibleFlows }: { entities: BaseVisualEntity[]; visibleFlows: IVisibleFlows }) =>
        useVisibleVizNodes(entities, visibleFlows),
      {
        initialProps: {
          entities: [e1, e2],
          visibleFlows: { e1: true, e2: false } as IVisibleFlows,
        },
      },
    );

    await waitFor(() => {
      expect(result.current.vizNodes).toEqual([nodeA]);
    });

    rerender({
      entities: [e1, e2],
      visibleFlows: { e1: true, e2: true } as IVisibleFlows,
    });

    await waitFor(() => {
      expect(result.current.vizNodes).toEqual([nodeA, nodeB]);
    });
  });
});
