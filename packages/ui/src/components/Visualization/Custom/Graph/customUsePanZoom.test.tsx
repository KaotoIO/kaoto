import { ElementContext, Point, Visualization } from '@patternfly/react-topology';
import { act, render } from '@testing-library/react';

import { usePanZoom } from './customUsePanZoom';

const Surface = () => {
  const ref = usePanZoom();
  return (
    <svg>
      <g ref={ref} />
    </svg>
  );
};

it('keeps D3 synchronized after the initial graph is replaced', () => {
  const controller = new Visualization();
  controller.fromModel({ graph: { id: 'g1', type: 'graph' } });
  const oldGraph = controller.getGraph();
  const { container, rerender } = render(
    <ElementContext.Provider value={oldGraph}>
      <Surface />
    </ElementContext.Provider>,
  );
  act(() => {
    controller.fromModel({ graph: { id: 'g1', type: 'graph' } }, false);
  });
  const graph = controller.getGraph();
  expect(graph).not.toBe(oldGraph);
  rerender(
    <ElementContext.Provider value={graph}>
      <Surface />
    </ElementContext.Provider>,
  );
  act(() => {
    graph.setPosition(new Point(120, 80));
    graph.setScale(0.75);
  });
  const svg = container.querySelector('svg') as SVGSVGElement & { __zoom: { x: number; y: number; k: number } };
  expect(svg.__zoom).toMatchObject({ x: 120, y: 80, k: 0.75 });
});
