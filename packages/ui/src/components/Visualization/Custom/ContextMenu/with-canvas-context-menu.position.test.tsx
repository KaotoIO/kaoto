import { TopologyView, WithContextMenuProps } from '@patternfly/react-topology';
import { fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';

import { TopologyElementWrapper } from '../../../../stubs/topology-element-wrapper';
import { ControllerService } from '../../Canvas/controller.service';
import * as CanvasMenu from './CanvasContextMenuItems';
import { CanvasContextMenu } from './CanvasContextMenuItems';
import { withCanvasContextMenu } from './with-canvas-context-menu';

// Capture the positioning contract; JSDOM cannot lay out Popper's floating menu.
beforeEach(() => {
  vi.spyOn(CanvasMenu, 'CanvasContextMenu').mockImplementation(({ children }: PropsWithChildren) => <>{children}</>);
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
  expect(CanvasContextMenu).toHaveBeenLastCalledWith(
    expect.objectContaining({ reference: { x: 100, y: 150 } }),
    undefined,
  );
});

it('keeps mouse invocation anchored at the pointer', () => {
  setup();
  fireEvent.contextMenu(screen.getByTestId('background'), { button: 2, clientX: 320, clientY: 240 });
  expect(CanvasContextMenu).toHaveBeenLastCalledWith(
    expect.objectContaining({ reference: { x: 320, y: 240 } }),
    undefined,
  );
});

const EmptyBackground = ({ onContextMenu }: WithContextMenuProps) => (
  <TopologyView
    id="canvas-main"
    aria-label="Route canvas"
    tabIndex={0}
    contextToolbar={<button>Routes</button>}
    onContextMenu={onContextMenu}
  >
    <div>No visible routes</div>
  </TopologyView>
);
const EmptyWrapped = withCanvasContextMenu(() => [<button key="action">Show all</button>], {
  isCanvasBackground: true,
})(EmptyBackground);

it.each(['F10', 'ContextMenu'])('anchors %s below the toolbar on an empty canvas', (key) => {
  render(<EmptyWrapped />);
  const canvas = screen.getByLabelText('Route canvas');
  const content = canvas.querySelector('.pf-topology-content')!;
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 800, 600));
  vi.spyOn(content, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 150, 800, 500));
  canvas.focus();
  fireEvent.keyDown(canvas, { key, shiftKey: key === 'F10' });
  expect(CanvasContextMenu).toHaveBeenLastCalledWith(
    expect.objectContaining({ reference: { x: 100, y: 150 } }),
    undefined,
  );
});
