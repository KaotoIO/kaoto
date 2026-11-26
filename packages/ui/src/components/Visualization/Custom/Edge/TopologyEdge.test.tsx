import {
  BaseNode,
  ComponentFactory,
  DefaultNode,
  DndManagerImpl,
  EdgeModel,
  EdgeStyle,
  GraphComponent,
  integralShapePath,
  ModelKind,
  Point,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
} from '@patternfly/react-topology';
import { render } from '@testing-library/react';

import { LayoutType } from '../../Canvas/canvas.models';
import { ControllerService } from '../../Canvas/controller.service';
import { getTopologyTagWidth, TOPOLOGY_TAG_HEIGHT, TOPOLOGY_TAG_SIDE_OFFSET } from './topology-tag-size';
import TopologyEdge from './TopologyEdge';

const componentFactory: ComponentFactory = (kind: ModelKind) => {
  switch (kind) {
    case ModelKind.graph:
      return GraphComponent;
    case ModelKind.node:
      return DefaultNode;
    case ModelKind.edge:
      return TopologyEdge;
    default:
      return undefined;
  }
};

describe('TopologyEdge', () => {
  it('should throw when element is not an Edge', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const nodeElement = new BaseNode();

    expect(() => {
      render(<TopologyEdge element={nodeElement} />);
    }).toThrow('TopologyEdge must be used only on Edge elements');
  });

  it('should render TaskEdge with directional terminal and topology node separation', () => {
    const controller = new Visualization();
    controller.registerComponentFactory(componentFactory);
    controller.fromModel({
      graph: { id: 'graph', type: 'graph' },
      nodes: [
        { id: 'node-1', type: 'node', x: 0, y: 0, width: 50, height: 50 },
        { id: 'node-2', type: 'node', x: 200, y: 150, width: 50, height: 50 },
      ],
      edges: [{ id: 'edge-1', type: 'edge', source: 'node-1', target: 'node-2' }],
    });

    const { container } = render(
      <VisualizationProvider controller={controller}>
        <VisualizationSurface />
      </VisualizationProvider>,
    );

    const edge = container.querySelector('[data-id="edge-1"]');
    expect(edge).toBeInTheDocument();
    expect(edge?.querySelector('[data-test-id="task-handler"]')).toBeInTheDocument();

    /* The edge path is drawn with the topology node separation */
    const element = controller.getEdgeById('edge-1')!;
    const expectedPath = integralShapePath(element.getStartPoint(), element.getEndPoint(), 0, 20, false);
    expect(expectedPath).not.toBe(
      integralShapePath(element.getStartPoint(), element.getEndPoint(), 0, undefined, false),
    );
    const path = edge?.querySelector(`path[d="${expectedPath}"]`);
    expect(path).toBeInTheDocument();

    /* Only the end terminal is directional, so a single connector arrow is rendered */
    expect(edge?.querySelectorAll('.pf-topology-connector-arrow')).toHaveLength(1);

    /* A solid edge without a label */
    expect(edge?.querySelector('.topology-edge--dashed')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="topology-edge-tag"]')).not.toBeInTheDocument();
  });

  describe('dashed edge with tags', () => {
    const labelledEdge = (id: string, source: string, label: string, target = 'node-2'): EdgeModel => ({
      id,
      type: 'edge',
      source,
      target,
      edgeStyle: EdgeStyle.dashed,
      label,
    });

    /** The distance between the center of a tag and the end of its edge, when the tag keeps clear of the arrow */
    const arrowClearance = (size: number) => 14 + 4 + size / 2;
    /** The middle of a tag above the segment that reaches the target, in a horizontal layout */
    const aboveTheEdge = (endPoint: Point) => endPoint.y - TOPOLOGY_TAG_SIDE_OFFSET - TOPOLOGY_TAG_HEIGHT / 2;
    /** The center of a tag on the right of the segment that reaches the target, in a vertical layout */
    const besideTheEdge = (endPoint: Point, label: string) =>
      endPoint.x + TOPOLOGY_TAG_SIDE_OFFSET + getTopologyTagWidth(label) / 2;

    const renderLabelledEdges = (
      layout: LayoutType | undefined,
      edges: EdgeModel[] = [labelledEdge('edge-1', 'node-1', 'support, billing')],
    ) => {
      const controller = new Visualization();
      controller.registerComponentFactory(componentFactory);
      controller.registerLayoutFactory(ControllerService.baselineLayoutFactory);
      controller.fromModel({
        graph: { id: 'graph', type: 'graph', layout },
        nodes: [
          { id: 'node-1', type: 'node', x: 0, y: 0, width: 50, height: 50 },
          { id: 'node-2', type: 'node', x: 200, y: 150, width: 50, height: 50 },
          { id: 'node-3', type: 'node', x: 0, y: 300, width: 50, height: 50 },
          { id: 'node-4', type: 'node', x: 400, y: 0, width: 50, height: 50 },
          { id: 'node-near', type: 'node', x: 100, y: 100, width: 50, height: 50 },
          { id: 'node-below', type: 'node', x: 0, y: 40, width: 50, height: 50 },
          { id: 'node-far', type: 'node', x: 1000, y: 1000, width: 50, height: 50 },
        ],
        edges,
      });

      const { container } = render(
        <VisualizationProvider controller={controller}>
          <VisualizationSurface />
        </VisualizationProvider>,
      );

      const firstEdge = controller.getEdgeById(edges[0].id)!;
      return {
        container,
        tags: Array.from(container.querySelectorAll('[data-testid="topology-edge-tag"]')),
        startPoint: firstEdge.getStartPoint(),
        endPoint: firstEdge.getEndPoint(),
      };
    };

    const getTagLabel = (tag: Element) => tag.querySelector('.topology-edge__tag__label')?.textContent ?? '';

    /** The center of a tag, from the translation of its top-left corner */
    const getTagCenter = (tag: Element): Point => {
      const [x, y] = (tag.getAttribute('transform') ?? '').match(/-?[\d.]+/g)!.map(Number);
      const width = Number(tag.querySelector('rect')?.getAttribute('width'));
      return new Point(x + width / 2, y + TOPOLOGY_TAG_HEIGHT / 2);
    };

    it('should draw the edge dashed', () => {
      const { container } = renderLabelledEdges(undefined);

      expect(container.querySelector('[data-test-id="task-handler"]')).toHaveClass('topology-edge--dashed');
    });

    it('should hide a link from an agent route of the Design view while a step is dragged', () => {
      const dragSpy = vi.spyOn(DndManagerImpl.prototype, 'isDragging').mockReturnValue(true);
      const { container, tags } = renderLabelledEdges(undefined, [
        { ...labelledEdge('edge-1', 'node-1', 'support'), data: { sourceSteps: ['node-1|step'] } },
      ]);
      dragSpy.mockRestore();

      expect(container.querySelector('[data-test-id="task-handler"]')).not.toBeInTheDocument();
      expect(tags).toHaveLength(0);
    });

    it('should keep a link of the Topology view while dragging', () => {
      const dragSpy = vi.spyOn(DndManagerImpl.prototype, 'isDragging').mockReturnValue(true);
      const { tags } = renderLabelledEdges(undefined);
      dragSpy.mockRestore();

      expect(tags).toHaveLength(1);
    });

    it('should draw the tags as a pill with a tag icon', () => {
      const { tags } = renderLabelledEdges(undefined);

      expect(tags).toHaveLength(1);
      expect(getTagLabel(tags[0])).toBe('support, billing');
      expect(tags[0].querySelector('title')).toHaveTextContent('Tags: support, billing');
      expect(tags[0].querySelector('.topology-edge__tag__icon')).toBeInTheDocument();
      expect(tags[0].querySelector('rect')).toHaveAttribute('width', `${getTopologyTagWidth('support, billing')}`);
    });

    it('should place the tags above the middle of a short segment that reaches the target in a horizontal layout', () => {
      const { tags, startPoint, endPoint } = renderLabelledEdges(LayoutType.DagreHorizontal, [
        labelledEdge('edge-1', 'node-1', 'support', 'node-near'),
      ]);

      const middleX = (Math.floor(startPoint.x + 10) + endPoint.x) / 2;
      expect(middleX).toBeGreaterThan(endPoint.x - arrowClearance(getTopologyTagWidth('support')));
      expect(getTagCenter(tags[0])).toEqual(new Point(middleX, aboveTheEdge(endPoint)));
    });

    it('should place the tags beside the middle of a short segment that reaches the target in a vertical layout', () => {
      const { tags, startPoint, endPoint } = renderLabelledEdges(LayoutType.DagreVertical, [
        labelledEdge('edge-1', 'node-1', 'support', 'node-below'),
      ]);

      const middleY = (Math.floor(startPoint.y + 10) + endPoint.y) / 2;
      expect(middleY).toBeGreaterThan(endPoint.y - arrowClearance(TOPOLOGY_TAG_HEIGHT));
      expect(getTagCenter(tags[0])).toEqual(new Point(besideTheEdge(endPoint, 'support'), middleY));
    });

    it('should keep the tags next to the arrow of a long segment in a horizontal layout', () => {
      const { tags, endPoint } = renderLabelledEdges(LayoutType.DagreHorizontal, [
        labelledEdge('edge-1', 'node-1', 'support', 'node-far'),
      ]);

      expect(getTagCenter(tags[0])).toEqual(
        new Point(endPoint.x - arrowClearance(getTopologyTagWidth('support')), aboveTheEdge(endPoint)),
      );
    });

    it('should keep the tags next to the arrow of a long segment in a vertical layout', () => {
      const { tags, endPoint } = renderLabelledEdges(LayoutType.DagreVertical, [
        labelledEdge('edge-1', 'node-1', 'support', 'node-far'),
      ]);

      expect(getTagCenter(tags[0])).toEqual(
        new Point(besideTheEdge(endPoint, 'support'), endPoint.y - arrowClearance(TOPOLOGY_TAG_HEIGHT)),
      );
    });

    it('should fit the pill to its measured text, still clear of the arrow', () => {
      const getBBoxSpy = vi
        .spyOn(SVGElement.prototype as SVGGraphicsElement, 'getBBox')
        .mockReturnValue({ x: 0, y: 0, width: 40, height: 12 } as DOMRect);
      const { tags, startPoint, endPoint } = renderLabelledEdges(undefined, [
        labelledEdge('edge-1', 'node-1', 'support'),
      ]);
      getBBoxSpy.mockRestore();

      const width = 2 * 10 + 16 + 40;
      const middleX = (Math.floor(startPoint.x + 10) + endPoint.x) / 2;
      expect(tags[0].querySelector('rect')).toHaveAttribute('width', `${width}`);
      expect(getTagCenter(tags[0])).toEqual(
        new Point(Math.max(middleX, endPoint.x - arrowClearance(width)), aboveTheEdge(endPoint)),
      );
      expect(tags[0].querySelector('.topology-edge__tag__label')).not.toHaveAttribute('textLength');
    });

    it('should condense a text that is wider than its pill', () => {
      const getBBoxSpy = vi
        .spyOn(SVGElement.prototype as SVGGraphicsElement, 'getBBox')
        .mockReturnValue({ x: 0, y: 0, width: 500, height: 12 } as DOMRect);
      const { tags } = renderLabelledEdges(undefined, [labelledEdge('edge-1', 'node-1', 'WWWWWWWW')]);
      getBBoxSpy.mockRestore();

      const text = tags[0].querySelector('.topology-edge__tag__label');
      expect(tags[0].querySelector('rect')).toHaveAttribute('width', `${getTopologyTagWidth('WWWWWWWW')}`);
      expect(text).toHaveAttribute('textLength', `${getTopologyTagWidth('WWWWWWWW') - 2 * 10 - 16}`);
      expect(text).toHaveAttribute('lengthAdjust', 'spacingAndGlyphs');
    });

    it('should not condense a text that fits its pill', () => {
      const { tags } = renderLabelledEdges(undefined);

      const text = tags[0].querySelector('.topology-edge__tag__label');
      expect(text).not.toHaveAttribute('textLength');
      expect(text).not.toHaveAttribute('lengthAdjust');
    });

    it('should stack the tags of the edges that reach the same node in a horizontal layout', () => {
      const { tags } = renderLabelledEdges(LayoutType.DagreHorizontal, [
        labelledEdge('edge-1', 'node-1', 'support'),
        labelledEdge('edge-2', 'node-3', 'billing'),
      ]);

      expect(tags.map(getTagLabel)).toEqual(['support', 'billing']);
      const [support, billing] = tags.map(getTagCenter);
      expect(billing.x).toEqual(support.x);
      expect(billing.y).toEqual(support.y - TOPOLOGY_TAG_HEIGHT - 4);
    });

    it('should put the tags of the edges that reach the same node side by side in a vertical layout', () => {
      const { tags, endPoint } = renderLabelledEdges(LayoutType.DagreVertical, [
        labelledEdge('edge-1', 'node-1', 'support'),
        labelledEdge('edge-2', 'node-3', 'billing, support'),
        labelledEdge('edge-3', 'node-4', 'orders'),
      ]);

      expect(tags.map(getTagLabel)).toEqual(['support', 'billing, support', 'orders']);
      const centers = tags.map(getTagCenter);
      const widths = ['support', 'billing, support', 'orders'].map(getTopologyTagWidth);
      const left = endPoint.x + TOPOLOGY_TAG_SIDE_OFFSET;
      expect(centers.map(({ x }) => x)).toEqual([
        left + widths[0] / 2,
        left + widths[0] + 4 + widths[1] / 2,
        left + widths[0] + 4 + widths[1] + 4 + widths[2] / 2,
      ]);
      expect(new Set(centers.map(({ y }) => y)).size).toBe(1);
    });

    it('should draw the same tags written in another order once', () => {
      const { tags } = renderLabelledEdges(LayoutType.DagreVertical, [
        labelledEdge('edge-1', 'node-1', 'support, billing'),
        labelledEdge('edge-2', 'node-3', 'billing, support'),
      ]);

      expect(tags.map(getTagLabel)).toEqual(['support, billing']);
    });

    it.each([LayoutType.DagreHorizontal, LayoutType.DagreVertical])(
      'should draw a label shared by the edges that reach the same node once in a %s layout',
      (layout) => {
        const { tags } = renderLabelledEdges(layout, [
          labelledEdge('edge-1', 'node-1', 'support'),
          labelledEdge('edge-2', 'node-3', 'support'),
          labelledEdge('edge-3', 'node-4', 'billing'),
        ]);

        expect(tags.map(getTagLabel)).toEqual(['support', 'billing']);
      },
    );
  });
});
