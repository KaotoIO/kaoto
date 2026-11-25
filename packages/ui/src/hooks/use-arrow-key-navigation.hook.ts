import hotkeys from 'hotkeys-js';
import { useEffect, useMemo } from 'react';

import { CanvasDefaults } from '../components/Visualization/Canvas/canvas.defaults';
import { CanvasNode } from '../components/Visualization/Canvas/canvas.models';

/**
 * Explicit ordering for named EIP property segments that would otherwise sort
 * alphabetically (e.g. `otherwise` < `steps` < `when`).
 *
 * This mirrors the mapper property ordering defined in ProcessorStepsService:
 *   choice:       steps(branch-placeholder) → when → otherwise
 *   doTry:        steps → doCatch → doFinally
 *   circuitBreaker: steps → onFallback
 *   routeConfiguration: intercept → interceptFrom → interceptSendToEndpoint → onException → onCompletion
 */
const SEGMENT_ORDER: Record<string, number> = {
  steps: 0,
  intercept: 0,
  when: 1,
  doCatch: 1,
  onFallback: 1,
  interceptFrom: 1,
  otherwise: 2,
  doFinally: 2,
  interceptSendToEndpoint: 2,
  onException: 3,
  onCompletion: 4,
};

/**
 * Extracts the viz-node path from a canvas element's `data-testid` attribute.
 * The testid format is `{type}__{path}`, e.g. `custom-node__route.from.steps.0.log`.
 * Returns an empty string if the attribute is absent or has no `__` separator.
 */
const getNodePath = (el: HTMLElement): string => {
  const testid = el.dataset.testid ?? '';
  const sep = testid.indexOf('__');
  return sep === -1 ? '' : testid.slice(sep + 2);
};

/**
 * Compares a single path segment pair.
 * - Empty string (path ended) → shorter (parent) path sorts first
 * - Both numeric → numeric comparison (natural sort: steps.9 < steps.10)
 * - One or both are known EIP property names → use SEGMENT_ORDER priority
 * - Otherwise → locale-aware string comparison
 */
const compareSegment = (aSeg: string, bSeg: string): number => {
  if (aSeg === '' && bSeg === '') return 0;
  if (aSeg === '') return -1;
  if (bSeg === '') return 1;

  const aNum = Number(aSeg);
  const bNum = Number(bSeg);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;

  const aOrder = SEGMENT_ORDER[aSeg];
  const bOrder = SEGMENT_ORDER[bSeg];
  if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
  if (aOrder !== undefined) return -1;
  if (bOrder !== undefined) return 1;

  return aSeg.localeCompare(bSeg);
};

/**
 * Compares two canvas elements by their embedded viz-node path (natural +
 * EIP-property-order aware), so navigation follows the logical graph shape
 * regardless of DOM paint order.
 */
const compareNodePaths = (a: HTMLElement, b: HTMLElement): number => {
  const aPath = getNodePath(a);
  const bPath = getNodePath(b);
  if (!aPath && !bPath) return 0;
  if (!aPath) return 1;
  if (!bPath) return -1;
  const aParts = aPath.split('.');
  const bParts = bPath.split('.');
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const aSeg = aParts[i] ?? '';
    const bSeg = bParts[i] ?? '';
    const cmp = compareSegment(aSeg, bSeg);
    if (cmp !== 0) return cmp;
  }
  return 0;
};

/** Returns the canvas model id carried by the closest `[data-id]` wrapper of a canvas element. */
const wrapperId = (el: HTMLElement): string => el.closest<HTMLElement>('[data-id]')?.dataset.id ?? '';

const ARROW_KEYS = 'arrowleft,arrowright,arrowup,arrowdown';

/**
 * Registers global hotkeys for arrow-key navigation between canvas nodes.
 * Uses hotkeys-js so the handler is automatically skipped when focus is
 * inside an INPUT, TEXTAREA, SELECT, or contenteditable — preventing the
 * canvas from stealing arrow keys from form fields.
 *
 * Navigation follows route order in the canvas model, then logical viz-node path order. The root group of
 * each flow (e.g. the route group) is the first stop of its flow, so its context menu is reachable by keyboard:
 * - ArrowRight / ArrowDown → next node
 * - ArrowLeft / ArrowUp → previous node
 * Wraps around at the ends.
 */
export function useArrowKeyNavigation(nodes?: readonly Pick<CanvasNode, 'id' | 'group' | 'parentNode'>[]): void {
  const { routeOrderByNodeId, rootGroupIds } = useMemo(() => {
    const routes = new Map<string, number>();
    const order = new Map<string, number>();
    const rootGroups = new Set<string>();
    const parentById = new Map(nodes?.map(({ id, parentNode }) => [id, parentNode]));
    // Canvas ids are `{scope}|{local id}` where both parts can contain pipes, so the id can't be split reliably.
    // The flow root, reached by following `parentNode`, identifies the route instead.
    const getFlowRootId = (id: string): string => {
      let rootId = id;
      let parentId = parentById.get(rootId);
      while (parentId && parentById.has(parentId)) {
        rootId = parentId;
        parentId = parentById.get(rootId);
      }
      return rootId;
    };
    nodes?.forEach(({ id, group, parentNode }) => {
      if (group && !parentNode) rootGroups.add(id);
      const flowRootId = getFlowRootId(id);
      const routeOrder = routes.get(flowRootId) ?? routes.size;
      routes.set(flowRootId, routeOrder);
      order.set(id, routeOrder);
    });
    return { routeOrderByNodeId: order, rootGroupIds: rootGroups };
  }, [nodes]);
  useEffect(() => {
    const navigate = (event: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const canvasRoot = document.getElementById(CanvasDefaults.CANVAS_MAIN_ID);
      const isCanvasFocus =
        active === canvasRoot || !!active?.matches?.('g.custom-node, g.placeholder-node, g.custom-group');
      if (!isCanvasFocus) return;

      const allNodes = Array.from(
        document.querySelectorAll<HTMLElement>('g.custom-node, g.placeholder-node, g.custom-group'),
      ).sort((a, b) => {
        const aOrder = routeOrderByNodeId.get(wrapperId(a)) ?? routeOrderByNodeId.size;
        const bOrder = routeOrderByNodeId.get(wrapperId(b)) ?? routeOrderByNodeId.size;
        const aRoot = rootGroupIds.has(wrapperId(a));
        const bRoot = rootGroupIds.has(wrapperId(b));
        return aOrder - bOrder || Number(bRoot) - Number(aRoot) || compareNodePaths(a, b);
      });
      if (allNodes.length === 0) return;

      event.preventDefault();

      const key = event.key.toLowerCase();
      const forward = key === 'arrowright' || key === 'arrowdown';
      const currentIndex = allNodes.indexOf(document.activeElement as HTMLElement);

      let nextIndex: number;
      if (currentIndex === -1) {
        nextIndex = forward ? 0 : allNodes.length - 1;
      } else {
        nextIndex = forward
          ? (currentIndex + 1) % allNodes.length
          : (currentIndex - 1 + allNodes.length) % allNodes.length;
      }

      allNodes[nextIndex].focus({ preventScroll: true });
    };

    hotkeys(ARROW_KEYS, navigate);

    return () => {
      hotkeys.unbind(ARROW_KEYS, navigate);
    };
  }, [routeOrderByNodeId, rootGroupIds]);
}
