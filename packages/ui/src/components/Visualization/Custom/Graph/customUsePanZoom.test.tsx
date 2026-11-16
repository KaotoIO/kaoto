import { ElementContext, Point, Visualization } from '@patternfly/react-topology';
import { act, fireEvent, render } from '@testing-library/react';

import { isInteractiveTarget, usePanZoom } from './customUsePanZoom';

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

describe('spacebar panning', () => {
  const PanningSurface = () => {
    const ref = usePanZoom({ enableSpacebarPanning: true });
    return (
      <>
        <svg data-testid="svg">
          <g ref={ref}>
            <g className="custom-node" role="button" tabIndex={0} data-testid="step" />
          </g>
        </svg>
        <button data-testid="button">Show all routes</button>
      </>
    );
  };

  const renderPanningSurface = () => {
    const controller = new Visualization();
    controller.fromModel({ graph: { id: 'g1', type: 'graph' } });
    const result = render(
      <ElementContext.Provider value={controller.getGraph()}>
        <PanningSurface />
      </ElementContext.Provider>,
    );
    // The pointer rests over the canvas
    fireEvent.mouseEnter(result.getByTestId('svg'));
    return result;
  };

  afterEach(() => {
    document.body.style.cursor = '';
  });

  it('lets Space activate a focused button while the pointer is over the canvas', () => {
    const { getByTestId } = renderPanningSurface();
    const button = getByTestId('button');
    button.focus();

    const notPrevented = fireEvent.keyDown(button, { code: 'Space', key: ' ' });

    expect(notPrevented).toBe(true);
    expect(document.body.style.cursor).toBe('');
  });

  it('starts panning on Space when a step has the focus', () => {
    const { getByTestId } = renderPanningSurface();
    const step = getByTestId('step');
    step.focus();

    const notPrevented = fireEvent.keyDown(step, { code: 'Space', key: ' ' });

    expect(notPrevented).toBe(false);
    expect(document.body.style.cursor).toBe('grab');
  });

  it('starts panning on Space when the canvas has the focus', () => {
    const { getByTestId } = renderPanningSurface();

    const notPrevented = fireEvent.keyDown(getByTestId('svg'), { code: 'Space', key: ' ' });

    expect(notPrevented).toBe(false);
    expect(document.body.style.cursor).toBe('grab');
  });
});

describe('isInteractiveTarget', () => {
  it.each([
    '<button></button>',
    '<input />',
    '<select></select>',
    '<textarea></textarea>',
    '<a href="#">link</a>',
    '<div contenteditable="true"></div>',
    '<div role="button"></div>',
    '<div role="menuitem"></div>',
  ])('is true for %s', (markup) => {
    const host = document.createElement('div');
    host.innerHTML = markup;

    expect(isInteractiveTarget(host.firstElementChild)).toBe(true);
  });

  it('is true inside an interactive element', () => {
    const host = document.createElement('div');
    host.innerHTML = '<button><span>label</span></button>';

    expect(isInteractiveTarget(host.querySelector('span'))).toBe(true);
  });

  it.each([
    ['the canvas', '<div id="canvas-main" tabindex="0"></div>'],
    ['an SVG element', '<svg><g></g></svg>'],
  ])('is false for %s', (_, markup) => {
    const host = document.createElement('div');
    host.innerHTML = markup;

    expect(isInteractiveTarget(host.firstElementChild)).toBe(false);
  });

  it('is false for a canvas step, which is an SVG button', () => {
    const host = document.createElement('div');
    host.innerHTML = '<svg><g class="custom-node" role="button"></g></svg>';

    expect(isInteractiveTarget(host.querySelector('g.custom-node'))).toBe(false);
  });

  it('is false without a target', () => {
    expect(isInteractiveTarget(null)).toBe(false);
  });
});
