import { renderHook } from '@testing-library/react';
import hotkeys, { KeyHandler } from 'hotkeys-js';

import { CanvasDefaults } from '../components/Visualization/Canvas/canvas.defaults';
import type { CanvasNode } from '../components/Visualization/Canvas/canvas.models';
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
  function setupHook(nodes?: Pick<CanvasNode, 'id' | 'group' | 'parentNode'>[]): (key: string) => void {
    const handlers: Record<string, KeyHandler> = {};
    mockHotkeys.mockImplementation((keys: string, ...args: unknown[]) => {
      const handler = args.find((arg): arg is KeyHandler => typeof arg === 'function');
      keys.split(',').forEach((k) => {
        if (handler) handlers[k.trim()] = handler;
      });
    });
    renderHook(() => {
      useArrowKeyNavigation(nodes);
    });
    // Return a helper that fires the captured handler for the given key name
    return (key: string) => {
      const handler = handlers[key.toLowerCase()] ?? handlers[key];
      handler?.(new KeyboardEvent('keydown', { key }), {
        key,
        keyup: false,
        keydown: true,
        method: handler,
        mods: [],
        scope: 'all',
        shortcut: key,
        splitKey: '+',
        element: document,
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

    it.each(['arrowdown', 'arrowright', 'arrowup', 'arrowleft'])(
      'keeps routes together in model order when navigating with %s',
      (key) => {
        container.remove();
        pathContainer = document.createElement('div');
        canvasRoot.appendChild(pathContainer);
        const paths = ['route.from', 'route.from.steps.0.log', 'route.from.steps.1.to'];
        const routes = ['z|first-route', 'a-second-route'];
        const ordered = routes.flatMap((route) =>
          paths.map((path) => {
            const node = makeNode('custom-node', `custom-node__${path}`);
            const wrapper = document.createElement('div');
            wrapper.dataset.id = `${route}|${path}`;
            wrapper.appendChild(node);
            return { node, wrapper };
          }),
        );
        // Paint order differs from model order and changes again during navigation.
        [...ordered].reverse().forEach(({ wrapper }) => pathContainer.appendChild(wrapper));
        const fire = setupHook(
          ordered.map(({ wrapper }, index) => {
            const flowStart = ordered[index - (index % paths.length)].wrapper.dataset.id!;
            return { id: wrapper.dataset.id!, parentNode: wrapper.dataset.id === flowStart ? undefined : flowStart };
          }),
        );
        const forward = key === 'arrowdown' || key === 'arrowright';
        const expected = forward ? ordered : [...ordered].reverse();
        canvasRoot.focus();
        for (const { node } of expected) {
          fire(key);
          expect(node).toHaveFocus();
          pathContainer.prepend(node.parentElement!);
          node.focus();
        }
        fire(key);
        expect(expected[0].node).toHaveFocus();
      },
    );

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

    it('should include the root group (single-segment path) as the first stop of its route', () => {
      pathContainer = document.createElement('div');
      const routeGroup = makeNode('custom-group', 'custom-group__route');
      const fromNode = makeNode('custom-node', 'custom-node__route.from');
      const logNode = makeNode('custom-node', 'custom-node__route.from.steps.0.log');

      // DOM order intentionally different from navigation order: the group is painted last
      pathContainer.appendChild(logNode);
      pathContainer.appendChild(fromNode);
      pathContainer.appendChild(routeGroup);
      document.body.appendChild(pathContainer);

      const fire = setupHook();

      canvasRoot.focus();
      fire('arrowright');
      expect(document.activeElement).toBe(routeGroup);

      fire('arrowright');
      expect(document.activeElement).toBe(fromNode);

      fire('arrowright');
      expect(document.activeElement).toBe(logNode);
    });

    it('should reach the root group from its first step with ArrowUp / ArrowLeft', () => {
      pathContainer = document.createElement('div');
      const routeGroup = makeNode('custom-group', 'custom-group__route');
      const fromNode = makeNode('custom-node', 'custom-node__route.from');

      pathContainer.appendChild(fromNode);
      pathContainer.appendChild(routeGroup);
      document.body.appendChild(pathContainer);

      const fire = setupHook();

      fromNode.focus();
      fire('arrowup');
      expect(document.activeElement).toBe(routeGroup);

      fromNode.focus();
      fire('arrowleft');
      expect(document.activeElement).toBe(routeGroup);
    });

    it('should keep each root group at the head of its own route when there are several routes', () => {
      pathContainer = document.createElement('div');
      canvasRoot.appendChild(pathContainer);
      const routes = ['first-route', 'second-route'];
      const ordered = routes.flatMap((route) =>
        [
          { cls: 'custom-group', path: 'route' },
          { cls: 'custom-node', path: 'route.from' },
          { cls: 'custom-node', path: 'route.from.steps.0.log' },
        ].map(({ cls, path }) => {
          const node = makeNode(cls, `${cls}__${path}`);
          const wrapper = document.createElement('div');
          wrapper.dataset.id = `${route}|${path}`;
          wrapper.appendChild(node);
          return { node, wrapper };
        }),
      );
      [...ordered].reverse().forEach(({ wrapper }) => pathContainer.appendChild(wrapper));

      const fire = setupHook(
        ordered.map(({ wrapper }, index) => {
          const id = wrapper.dataset.id!;
          return index % 3 === 0
            ? { id, group: true }
            : { id, parentNode: ordered[index - (index % 3)].wrapper.dataset.id! };
        }),
      );

      canvasRoot.focus();
      for (const { node } of ordered) {
        fire('arrowdown');
        expect(node).toHaveFocus();
      }
    });

    it('should keep the root group ahead of its children when the flow name contains a pipe (Citrus)', () => {
      container.remove();
      pathContainer = document.createElement('div');
      canvasRoot.appendChild(pathContainer);
      const testName = 'smoke|login';
      const rootId = `${testName}|${testName}`;
      const entries = [
        { cls: 'custom-group', path: testName, id: rootId },
        { cls: 'custom-node', path: 'actions.0.createVariables', id: `${testName}|actions.0.createVariables` },
        { cls: 'custom-node', path: 'actions.1.print', id: `${testName}|actions.1.print` },
      ].map(({ cls, path, id }) => {
        const node = makeNode(cls, `${cls}__${path}`);
        const wrapper = document.createElement('div');
        wrapper.dataset.id = id;
        wrapper.appendChild(node);
        return { node, wrapper, id };
      });
      // Paint order is the reverse of the navigation order.
      [...entries].reverse().forEach(({ wrapper }) => pathContainer.appendChild(wrapper));

      // FlowService emits a group after its children.
      const fire = setupHook([
        ...entries.slice(1).map(({ id }) => ({ id, parentNode: rootId })),
        { id: rootId, group: true },
      ]);

      canvasRoot.focus();
      for (const { node } of entries) {
        fire('arrowright');
        expect(node).toHaveFocus();
      }

      fire('arrowleft');
      fire('arrowleft');
      expect(entries[0].node).toHaveFocus();
    });

    it('should make the root group of a flow whose id is not a path the first stop (Pipe, Citrus)', () => {
      container.remove();
      pathContainer = document.createElement('div');
      canvasRoot.appendChild(pathContainer);
      const scope = 'timer-to-log';
      const groupId = `${scope}|${scope}`;
      const group = makeNode('custom-group', `custom-group__${scope}`);
      const leafPaths = ['source', 'steps.0', 'sink'];
      const leaves = leafPaths.map((path) => makeNode('custom-node', `custom-node__${path}`));
      const entries = [
        { node: group, id: groupId },
        ...leaves.map((node, index) => ({ node, id: `${scope}|${leafPaths[index]}` })),
      ];
      // Paint order is scrambled so it cannot explain the navigation order.
      [entries[2], entries[0], entries[3], entries[1]].forEach(({ node, id }) => {
        const wrapper = document.createElement('div');
        wrapper.dataset.id = id;
        wrapper.appendChild(node);
        pathContainer.appendChild(wrapper);
      });

      const fire = setupHook([
        { id: groupId, group: true },
        ...entries.slice(1).map(({ id }) => ({ id, parentNode: groupId })),
      ]);

      canvasRoot.focus();
      fire('arrowright');
      expect(document.activeElement).toBe(group);

      // The flow goes source → steps → sink, and neither `source` nor `sink` is a prefix of the other paths
      const visited = leaves.map(() => {
        fire('arrowright');
        return document.activeElement;
      });
      expect(visited).toEqual(leaves);
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

    it('should order routeConfiguration placeholders as: intercept → interceptFrom → interceptSendToEndpoint → onException → onCompletion', () => {
      pathContainer = document.createElement('div');
      const properties = ['intercept', 'interceptFrom', 'interceptSendToEndpoint', 'onException', 'onCompletion'];
      const placeholders = properties.map((property) =>
        makeNode('placeholder-node', `placeholder-node__routeConfiguration.${property}`),
      );

      // DOM order intentionally different from navigation order
      for (const n of [placeholders[4], placeholders[2], placeholders[0], placeholders[3], placeholders[1]]) {
        pathContainer.appendChild(n);
      }
      document.body.appendChild(pathContainer);

      const fire = setupHook();

      placeholders[0].focus();
      for (const expected of placeholders.slice(1)) {
        fire('arrowright');
        expect(document.activeElement).toBe(expected);
      }
    });
  });
});
