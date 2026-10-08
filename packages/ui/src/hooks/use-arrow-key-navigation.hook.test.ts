import { renderHook } from '@testing-library/react';
import hotkeys, { KeyHandler } from 'hotkeys-js';

import { CanvasDefaults } from '../components/Visualization/Canvas/canvas.defaults';
import { useArrowKeyNavigation } from './use-arrow-key-navigation.hook';

/* hotkeys-js is mocked globally in vitest-mocks-setup.ts */
const mockHotkeys = vi.mocked(hotkeys);

describe('useArrowKeyNavigation', () => {
  let node1: SVGGElement;
  let node2: SVGGElement;
  let node3: SVGGElement;
  let container: HTMLDivElement;
  let canvasRoot: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();

    canvasRoot = document.createElement('div');
    canvasRoot.id = CanvasDefaults.CANVAS_MAIN_ID;
    canvasRoot.setAttribute('tabindex', '-1');
    document.body.appendChild(canvasRoot);

    container = document.createElement('div');

    node1 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    node2 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    node3 = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    node1.setAttribute('class', 'custom-node');
    node2.setAttribute('class', 'custom-node');
    node3.setAttribute('class', 'placeholder-node');

    node1.setAttribute('tabindex', '-1');
    node2.setAttribute('tabindex', '-1');
    node3.setAttribute('tabindex', '-1');

    container.appendChild(node1);
    container.appendChild(node2);
    container.appendChild(node3);
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (canvasRoot.parentNode) {
      canvasRoot.parentNode.removeChild(canvasRoot);
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  /** Render the hook and capture the handler registered with hotkeys */
  function setupHook(): (key: string) => void {
    const handlers: Record<string, KeyHandler> = {};
    mockHotkeys.mockImplementation((keys: string, ...args: unknown[]) => {
      const handler = args.find((arg): arg is KeyHandler => typeof arg === 'function');
      keys.split(',').forEach((k) => {
        if (handler) handlers[k.trim()] = handler;
      });
    });
    renderHook(() => {
      useArrowKeyNavigation();
    });
    // Return a helper that fires the captured handler for the given key name
    return (key: string) => {
      const handler = handlers[key.toLowerCase()] ?? handlers[key];
      handler?.(new KeyboardEvent('keydown', { key }), {
        key,
        keys: [],
        method: handler,
        mods: [],
        scope: 'all',
        shortcut: key,
      });
    };
  }

  it('should bind arrow key hotkeys on mount', () => {
    renderHook(() => {
      useArrowKeyNavigation();
    });
    expect(mockHotkeys).toHaveBeenCalledWith(expect.stringContaining('arrowright'), expect.any(Function));
  });

  it('should unbind arrow key hotkeys on unmount', () => {
    const { unmount } = renderHook(() => {
      useArrowKeyNavigation();
    });
    unmount();
    expect(mockHotkeys.unbind).toHaveBeenCalled();
  });

  it.each([
    ['ArrowRight focuses the first node when canvas root is active', 'arrowright', 'canvasRoot', 'node1'] as const, // canvas root active, no node selected
    ['ArrowLeft focuses the last node when canvas root is active', 'arrowleft', 'canvasRoot', 'node3'] as const, // canvas root active, no node selected
    ['ArrowRight moves to the next node', 'arrowright', 'node1', 'node2'] as const,
    ['ArrowLeft moves to the previous node', 'arrowleft', 'node2', 'node1'] as const,
  ])('%s', (_description, key, startId, expectedId) => {
    const nodeMap = { canvasRoot, node1, node2, node3 };
    const fire = setupHook();
    nodeMap[startId].focus();
    fire(key);
    expect(document.activeElement).toBe(nodeMap[expectedId]);
  });

  it('should wrap from last to first on ArrowRight', () => {
    const fire = setupHook();
    node3.focus();
    fire('arrowright');
    expect(document.activeElement).toBe(node1);
  });

  it('should wrap from first to last on ArrowLeft', () => {
    const fire = setupHook();
    node1.focus();
    fire('arrowleft');
    expect(document.activeElement).toBe(node3);
  });

  it('should also navigate with ArrowDown / ArrowUp', () => {
    const fire = setupHook();
    node1.focus();
    fire('arrowdown');
    expect(document.activeElement).toBe(node2);

    fire('arrowup');
    expect(document.activeElement).toBe(node1);
  });

  describe('path-based ordering', () => {
    let pathContainer: HTMLDivElement;

    afterEach(() => {
      if (pathContainer?.parentNode) {
        pathContainer.parentNode.removeChild(pathContainer);
      }
    });

    const makeNode = (cls: string, testid: string): SVGGElement => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', cls);
      g.setAttribute('data-testid', testid);
      g.setAttribute('tabindex', '-1');
      return g;
    };

    it('should navigate in path order even when DOM order is different', () => {
      pathContainer = document.createElement('div');
      const step1 = makeNode('custom-node', 'custom-node__route.from.steps.0.log');
      const step2 = makeNode('custom-node', 'custom-node__route.from.steps.1.to');
      const group = makeNode('custom-group', 'custom-group__route.from.steps.2.choice');

      // DOM order: group first, then step2, then step1 — intentionally wrong
      pathContainer.appendChild(group);
      pathContainer.appendChild(step2);
      pathContainer.appendChild(step1);
      document.body.appendChild(pathContainer);

      const fire = setupHook();

      step1.focus();
      fire('arrowright');
      expect(document.activeElement).toBe(step2);

      fire('arrowright');
      expect(document.activeElement).toBe(group);
    });

    it('should sort numeric path segments numerically, not lexicographically', () => {
      pathContainer = document.createElement('div');
      const step9 = makeNode('custom-node', 'custom-node__route.from.steps.9.log');
      const step10 = makeNode('custom-node', 'custom-node__route.from.steps.10.log');

      // DOM order: step10 first (wrong)
      pathContainer.appendChild(step10);
      pathContainer.appendChild(step9);
      document.body.appendChild(pathContainer);

      const fire = setupHook();

      step9.focus();
      fire('arrowright');
      expect(document.activeElement).toBe(step10);
    });

    it('should exclude g.custom-group elements without a dot in their data-testid (route container)', () => {
      pathContainer = document.createElement('div');
      const routeContainer = makeNode('custom-group', 'custom-group__route');
      const stepNode = makeNode('custom-node', 'custom-node__route.from');

      pathContainer.appendChild(routeContainer);
      pathContainer.appendChild(stepNode);
      document.body.appendChild(pathContainer);

      const fire = setupHook();

      // Only stepNode should be in the navigation list; routeContainer has no dot
      canvasRoot.focus();
      fire('arrowright');
      expect(document.activeElement).toBe(stepNode);
    });

    it('should order choice children as: when-placeholder → when[0] → when[0] steps → otherwise → otherwise steps', () => {
      pathContainer = document.createElement('div');
      const base = 'route.from.steps.2.choice';

      // In DOM order PatternFly renders groups first — intentionally wrong order
      const otherwise = makeNode('custom-group', `custom-group__${base}.otherwise`);
      const otherwiseLog = makeNode('custom-node', `custom-node__${base}.otherwise.steps.0.log`);
      const otherwisePlaceholder = makeNode(
        'placeholder-node',
        `placeholder-node__${base}.otherwise.steps.1.placeholder`,
      );
      const whenPlaceholder = makeNode('placeholder-node', `placeholder-node__${base}.when`);
      const when0 = makeNode('custom-group', `custom-group__${base}.when.0`);
      const when0Log = makeNode('custom-node', `custom-node__${base}.when.0.steps.0.log`);
      const when0Placeholder = makeNode('placeholder-node', `placeholder-node__${base}.when.0.steps.1.placeholder`);

      for (const n of [
        otherwise,
        otherwiseLog,
        otherwisePlaceholder,
        whenPlaceholder,
        when0,
        when0Log,
        when0Placeholder,
      ]) {
        pathContainer.appendChild(n);
      }
      document.body.appendChild(pathContainer);

      const fire = setupHook();

      whenPlaceholder.focus();
      fire('arrowright');
      expect(document.activeElement).toBe(when0);

      fire('arrowright');
      expect(document.activeElement).toBe(when0Log);

      fire('arrowright');
      expect(document.activeElement).toBe(when0Placeholder);

      fire('arrowright');
      expect(document.activeElement).toBe(otherwise);

      fire('arrowright');
      expect(document.activeElement).toBe(otherwiseLog);

      fire('arrowright');
      expect(document.activeElement).toBe(otherwisePlaceholder);
    });

    it('should order doTry children as: steps → doCatch → doFinally', () => {
      pathContainer = document.createElement('div');
      const base = 'route.from.steps.0.doTry';

      const stepPlaceholder = makeNode('placeholder-node', `placeholder-node__${base}.steps.0.placeholder`);
      const doCatch = makeNode('custom-group', `custom-group__${base}.doCatch.0`);
      const doFinally = makeNode('custom-group', `custom-group__${base}.doFinally`);

      for (const n of [doFinally, doCatch, stepPlaceholder]) {
        pathContainer.appendChild(n);
      }
      document.body.appendChild(pathContainer);

      const fire = setupHook();

      stepPlaceholder.focus();
      fire('arrowright');
      expect(document.activeElement).toBe(doCatch);

      fire('arrowright');
      expect(document.activeElement).toBe(doFinally);
    });
  });
});
