import hotkeys from 'hotkeys-js';
import { useEffect, useMemo, useRef } from 'react';

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
 */
const SEGMENT_ORDER: Record<string, number> = {
  steps: 0,
  when: 1,
  doCatch: 1,
  onFallback: 1,
  otherwise: 2,
  doFinally: 2,
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

const ARROW_KEYS = 'arrowleft,arrowright,arrowup,arrowdown';

/**
 * Registers global hotkeys for arrow-key navigation between canvas nodes.
 * Uses hotkeys-js so the handler is automatically skipped when focus is
 * inside an INPUT, TEXTAREA, SELECT, or contenteditable — preventing the
 * canvas from stealing arrow keys from form fields.
 *
 * Navigation follows route order in the canvas model, then logical viz-node path order:
 * - ArrowRight / ArrowDown → next node
 * - ArrowLeft / ArrowUp → previous node
 * Wraps around at the ends.
 */
export function useArrowKeyNavigation(selectedNodeId?: string, nodes?: readonly Pick<CanvasNode, 'id'>[]): void {
  const routeOrderByNodeId = useMemo(() => {
    const routes = new Map<string, number>();
    const order = new Map<string, number>();
    nodes?.forEach(({ id }) => {
      // FlowService prefixes each path with its entity scope; the scope can itself contain pipes.
      const separator = id.lastIndexOf('|');
      const scope = separator === -1 ? id : id.slice(0, separator);
      const routeOrder = routes.get(scope) ?? routes.size;
      routes.set(scope, routeOrder);
      order.set(id, routeOrder);
    });
    return order;
  }, [nodes]);
  const lastFocusedNode = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selectedNodeId) return;
    const canvas = document.getElementById(CanvasDefaults.CANVAS_MAIN_ID);
    lastFocusedNode.current =
      Array.from(canvas?.querySelectorAll<HTMLElement>('g.custom-node, g.placeholder-node, g.custom-group') ?? []).find(
        (node) => node.closest<SVGElement>('[data-id]')?.dataset.id === selectedNodeId,
      ) ?? null;
  }, [selectedNodeId]);

  useEffect(() => {
    const rememberFocus = (event: FocusEvent) => {
      const target = event.target;
      const canvas = document.getElementById(CanvasDefaults.CANVAS_MAIN_ID);
      if (
        target instanceof Element &&
        canvas?.contains(target) &&
        target.matches('g.custom-node, g.placeholder-node, g.custom-group')
      ) {
        lastFocusedNode.current = target as HTMLElement;
      }
    };
    document.addEventListener('focusin', rememberFocus);
    const navigate = (event: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const canvasRoot = document.getElementById(CanvasDefaults.CANVAS_MAIN_ID);
      const isCanvasFocus =
        active === canvasRoot || !!active?.matches?.('g.custom-node, g.placeholder-node, g.custom-group');
      if (!isCanvasFocus) return;

      const allNodes = Array.from(
        document.querySelectorAll<HTMLElement>('g.custom-node, g.placeholder-node, g.custom-group[data-testid*="."]'),
      ).sort((a, b) => {
        const aOrder =
          routeOrderByNodeId.get(a.closest<HTMLElement>('[data-id]')?.dataset.id ?? '') ?? routeOrderByNodeId.size;
        const bOrder =
          routeOrderByNodeId.get(b.closest<HTMLElement>('[data-id]')?.dataset.id ?? '') ?? routeOrderByNodeId.size;
        return aOrder - bOrder || compareNodePaths(a, b);
      });
      if (allNodes.length === 0) return;

      event.preventDefault();

      const key = event.key.toLowerCase();
      const forward = key === 'arrowright' || key === 'arrowdown';
      // A background click dismisses selection without discarding the navigation position.
      const origin = active === canvasRoot ? lastFocusedNode.current : active;
      const currentIndex = origin ? allNodes.indexOf(origin) : -1;

      let nextIndex: number;
      if (currentIndex === -1) {
        nextIndex = forward ? 0 : allNodes.length - 1;
      } else {
        nextIndex = forward
          ? (currentIndex + 1) % allNodes.length
          : (currentIndex - 1 + allNodes.length) % allNodes.length;
      }

      lastFocusedNode.current = allNodes[nextIndex];
      allNodes[nextIndex].focus({ preventScroll: true });
    };

    hotkeys(ARROW_KEYS, navigate);

    return () => {
      document.removeEventListener('focusin', rememberFocus);
      hotkeys.unbind(ARROW_KEYS, navigate);
    };
  }, [routeOrderByNodeId]);
}
