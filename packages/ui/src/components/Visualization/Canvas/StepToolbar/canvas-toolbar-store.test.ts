import { BaseNode } from '@patternfly/react-topology';

import { createVisualizationNode, NodeToolbarTrigger } from '../../../../models';
import { CanvasToolbarStore, CanvasToolbarTarget } from './canvas-toolbar-store';

const target = (id: string): CanvasToolbarTarget => {
  const element = new BaseNode();
  element.setId(id);
  return {
    element,
    vizNode: createVisualizationNode(id, {
      name: 'log',
      path: id,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }),
    isCollapsed: false,
  };
};

describe('CanvasToolbarStore', () => {
  let store: CanvasToolbarStore;
  let a: CanvasToolbarTarget;
  let b: CanvasToolbarTarget;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new CanvasToolbarStore(NodeToolbarTrigger.onHover);
    a = target('a');
    b = target('b');
  });

  afterEach(() => {
    store.dispose();
    vi.useRealTimers();
  });

  const hover = (node: CanvasToolbarTarget) => {
    store.enter(node);
    vi.advanceTimersByTime(200);
  };

  it('has a single owner when moving between nodes, despite old leave events', () => {
    hover(a);
    expect(store.target).toBe(a);
    store.leave(a);
    hover(b);
    expect(store.target).toBe(b);
    store.leave(a);
    vi.advanceTimersByTime(500);
    expect(store.target).toBe(b);
  });

  it('requires stable hover and keeps the previous toolbar while switching', () => {
    store.enter(a);
    vi.advanceTimersByTime(199);
    expect(store.target).toBeUndefined();
    vi.advanceTimersByTime(1);
    store.leave(a);
    store.enter(b);
    vi.advanceTimersByTime(199);
    expect(store.target).toBe(a);
    vi.advanceTimersByTime(1);
    expect(store.target).toBe(b);
  });

  it('bridges the gap to the toolbar and cancels a pending switch on toolbar entry', () => {
    hover(a);
    store.leave(a);
    store.enter(b);
    vi.advanceTimersByTime(100);
    store.leave(b);
    store.enterToolbar();
    vi.advanceTimersByTime(1000);
    expect(store.target).toBe(a);
    store.leaveToolbar();
    vi.advanceTimersByTime(249);
    expect(store.target).toBe(a);
    vi.advanceTimersByTime(1);
    expect(store.target).toBeUndefined();
  });

  it('retains the target while a toolbar button is focused', () => {
    hover(a);
    store.focusToolbar();
    store.leave(a);
    hover(b);
    expect(store.target).toBe(a);
    store.blurToolbar();
    vi.advanceTimersByTime(250);
    expect(store.target).toBeUndefined();
  });

  it('ignores selection in hover mode and hover in selection mode', () => {
    store.update(a, true);
    expect(store.target).toBeUndefined();
    store.setTrigger(NodeToolbarTrigger.onSelection);
    hover(a);
    expect(store.target).toBeUndefined();
    store.update(a, true);
    expect(store.target).toBe(a);
    store.leave(a);
    vi.advanceTimersByTime(1000);
    expect(store.target).toBe(a);
    store.update(b, true);
    store.update(a, false);
    expect(store.target).toBe(b);
    store.update(b, false);
    expect(store.target).toBeUndefined();
  });

  it('updates active content without reopening an inactive target', () => {
    hover(a);
    const updated = { ...a, isCollapsed: true };
    store.update(updated, false);
    expect(store.target).toBe(updated);
    store.update(b, false);
    expect(store.target).toBe(updated);
  });

  it('cancels pending activation when a target disappears', () => {
    store.enter(a);
    store.remove(a.element);
    vi.advanceTimersByTime(1000);
    expect(store.target).toBeUndefined();
    hover(b);
    store.remove(a.element);
    expect(store.target).toBe(b);
    store.remove(b.element);
    expect(store.target).toBeUndefined();
  });

  it('dismisses the old toolbar when a pending target disappears', () => {
    hover(a);
    store.leave(a);
    store.enter(b);
    store.remove(b.element);
    vi.advanceTimersByTime(250);
    expect(store.target).toBeUndefined();
  });

  it('resets timers on mode change and disposal', () => {
    store.enter(a);
    store.setTrigger(NodeToolbarTrigger.onSelection);
    vi.advanceTimersByTime(1000);
    expect(store.target).toBeUndefined();
    store.setTrigger(NodeToolbarTrigger.onHover);
    store.enter(b);
    store.dispose();
    vi.advanceTimersByTime(1000);
    expect(store.target).toBeUndefined();
  });

  it('isolates different canvases', () => {
    const other = new CanvasToolbarStore(NodeToolbarTrigger.onSelection);
    other.update(b, true);
    hover(a);
    expect(store.target).toBe(a);
    expect(other.target).toBe(b);
    other.dispose();
  });
});
