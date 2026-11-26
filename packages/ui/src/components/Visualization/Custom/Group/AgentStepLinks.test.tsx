import { DndManagerImpl, EdgeModel, NodeModel, Visualization } from '@patternfly/react-topology';
import { render } from '@testing-library/react';
import { act } from 'react';

import { TopologyElementWrapper } from '../../../../stubs/topology-element-wrapper';
import { LayoutType } from '../../Canvas/canvas.models';
import { ControllerService } from '../../Canvas/controller.service';
import { getRouteLinkExit, getRouteLinkStart } from '../route-link-anchor';
import { getAgentStepLinkPoints, getAgentStepPort, roundedPath } from './agent-step-link-path';
import { AgentStepLinks } from './AgentStepLinks';

describe('AgentStepLinks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const step = (id: string, x: number, y = 50): NodeModel => ({ id, type: 'node', x, y, width: 90, height: 75 });

  const renderRoute = (
    sourceSteps: string[] | undefined,
    {
      layout,
      extraNodes = [],
      collapsedRoute = false,
    }: { layout?: LayoutType; extraNodes?: NodeModel[]; collapsedRoute?: boolean } = {},
  ) => {
    const controller = new Visualization();
    controller.registerLayoutFactory(ControllerService.baselineLayoutFactory);
    const edges: EdgeModel[] = sourceSteps
      ? [{ id: 'link', type: 'edge', source: 'route', target: 'tool', data: { sourceSteps } }]
      : [];
    controller.fromModel({
      graph: { id: 'graph', type: 'graph', layout },
      nodes: [
        {
          id: 'route',
          type: 'group',
          group: true,
          collapsed: collapsedRoute,
          children: ['agent-1', 'agent-2', ...extraNodes.filter((node) => node.id === 'container').map((n) => n.id)],
        },
        step('agent-1', 100),
        step('agent-2', 300),
        ...extraNodes,
        step('tool', 900),
      ],
      edges,
    });

    const route = controller.getNodeById('route')!;
    const { container } = render(
      <TopologyElementWrapper controller={controller} element={route}>
        <AgentStepLinks element={route} />
      </TopologyElementWrapper>,
    );
    return { container, getNode: (id: string) => controller.getNodeById(id)! };
  };

  it('should draw nothing for a route without links to tools', () => {
    const { container } = renderRoute(undefined);

    expect(container.querySelector('[data-testid="agent-step-link"]')).not.toBeInTheDocument();
  });

  it.each([LayoutType.DagreHorizontal, LayoutType.DagreVertical])(
    'should draw a dashed link from each agent step, with a port on the step, in a %s layout',
    (layout) => {
      const { container, getNode } = renderRoute(['agent-1', 'agent-2'], { layout });
      const isHorizontal = layout === LayoutType.DagreHorizontal;

      const links = container.querySelectorAll('[data-testid="agent-step-link"]');
      expect(links).toHaveLength(2);
      const port = getAgentStepPort(getNode('agent-1'), isHorizontal);
      expect(links[0].querySelector('circle')).toHaveAttribute('cx', `${port.x}`);
      expect(links[0].querySelector('circle')).toHaveAttribute('cy', `${port.y}`);
      expect(links[0].querySelector('path')).toHaveClass('agent-step-link__body');
    },
  );

  it('should draw the link from where it leaves the route, so the dashes of the links that share it line up', () => {
    const { container, getNode } = renderRoute(['agent-1'], { layout: LayoutType.DagreHorizontal });

    const points = getAgentStepLinkPoints(getNode('agent-1'), getNode('route'), true);
    expect(container.querySelector('path')).toHaveAttribute('d', roundedPath([...points].reverse()));
  });

  const collapsedContainer = (collapsed: boolean): NodeModel[] => [
    { ...step('container', 500), group: true, collapsed, children: ['hidden-agent-1', 'hidden-agent-2'] },
    step('hidden-agent-1', 700, 150),
    step('hidden-agent-2', 700, 300),
  ];

  it('should start the links of the steps inside a collapsed container from the container, once', () => {
    const { container, getNode } = renderRoute(['hidden-agent-1', 'hidden-agent-2'], {
      layout: LayoutType.DagreHorizontal,
      extraNodes: collapsedContainer(true),
    });

    const links = container.querySelectorAll('[data-testid="agent-step-link"]');
    expect(links).toHaveLength(1);
    expect(links[0].querySelector('circle')).toHaveAttribute('cx', `${getAgentStepPort(getNode('container'), true).x}`);
  });

  it('should start the links from the steps again once their container is expanded', () => {
    const { container, getNode } = renderRoute(['hidden-agent-1'], {
      layout: LayoutType.DagreHorizontal,
      extraNodes: collapsedContainer(true),
    });

    act(() => {
      getNode('container').setCollapsed(false);
    });

    const port = getAgentStepPort(getNode('hidden-agent-1'), true);
    expect(container.querySelector('circle')).toHaveAttribute('cx', `${port.x}`);
    expect(container.querySelector('circle')).toHaveAttribute('cy', `${port.y}`);
  });

  it('should draw the link of a collapsed route from its side to where the link to the tools starts', () => {
    const { container, getNode } = renderRoute(['agent-1', 'agent-2'], {
      layout: LayoutType.DagreHorizontal,
      collapsedRoute: true,
    });

    const route = getNode('route');
    const exit = getRouteLinkExit(route);
    expect(container.querySelectorAll('[data-testid="agent-step-link"]')).toHaveLength(1);
    expect(container.querySelector('circle')).toHaveAttribute('cx', `${exit.x}`);
    expect(container.querySelector('path')).toHaveAttribute('d', roundedPath([getRouteLinkStart(route), exit]));
    /* The layer draws the content of a collapsed route from where the route is */
    const position = route.getPosition();
    expect(container.querySelector('[data-testid="agent-step-link"]')?.parentElement).toHaveAttribute(
      'transform',
      `translate(${-position.x}, ${-position.y})`,
    );
  });

  it('should hide the links while a step is dragged', () => {
    vi.spyOn(DndManagerImpl.prototype, 'isDragging').mockReturnValue(true);

    const { container } = renderRoute(['agent-1']);

    expect(container.querySelector('[data-testid="agent-step-link"]')).not.toBeInTheDocument();
  });

  it('should skip the steps that are not on the canvas', () => {
    const { container } = renderRoute(['missing', 'agent-2']);

    expect(container.querySelectorAll('[data-testid="agent-step-link"]')).toHaveLength(1);
  });
});
