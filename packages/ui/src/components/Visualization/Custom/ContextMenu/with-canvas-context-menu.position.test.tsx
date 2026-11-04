import * as Topology from '@patternfly/react-topology';
import { ContextMenu, WithContextMenuProps } from '@patternfly/react-topology';
import { fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';

import { TopologyElementWrapper } from '../../../../stubs/topology-element-wrapper';
import { ControllerService } from '../../Canvas/controller.service';
import { withCanvasContextMenu } from './with-canvas-context-menu';

// Capture the positioning contract; JSDOM cannot lay out Popper's floating menu.
beforeEach(() => {
  vi.spyOn(Topology, 'ContextMenu').mockImplementation(({ children }: PropsWithChildren) => <>{children}</>);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const Background = ({ onContextMenu }: WithContextMenuProps) => (
  <rect data-testid="background" onContextMenu={onContextMenu} />
);
const Wrapped = withCanvasContextMenu(() => [
  <button key="action" role="menuitem">
    Show all
  </button>,
])(Background);

function setup() {
  const controller = ControllerService.createController();
  controller.fromModel({ graph: { id: 'graph', type: 'graph' } }, false);
  render(
    <div id="canvas-main" aria-label="Route canvas" tabIndex={0}>
      <div className="pf-topology-visualization-surface" data-testid="drawing-surface">
        <TopologyElementWrapper controller={controller} element={controller.getGraph()}>
          <Wrapped />
        </TopologyElementWrapper>
      </div>
    </div>,
  );
  const canvas = screen.getByLabelText('Route canvas');
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 800, 600));
  vi.spyOn(screen.getByTestId('drawing-surface'), 'getBoundingClientRect').mockReturnValue(
    new DOMRect(100, 150, 800, 500),
  );
  return canvas;
}

it.each(['F10', 'ContextMenu'])('anchors %s below the toolbar at the drawing surface', (key) => {
  const canvas = setup();
  canvas.focus();
  fireEvent.keyDown(canvas, { key, shiftKey: key === 'F10' });
  expect(ContextMenu).toHaveBeenLastCalledWith(expect.objectContaining({ reference: { x: 100, y: 150 } }), undefined);
});

it('keeps mouse invocation anchored at the pointer', () => {
  setup();
  fireEvent.contextMenu(screen.getByTestId('background'), { button: 2, clientX: 320, clientY: 240 });
  expect(ContextMenu).toHaveBeenLastCalledWith(expect.objectContaining({ reference: { x: 320, y: 240 } }), undefined);
});
