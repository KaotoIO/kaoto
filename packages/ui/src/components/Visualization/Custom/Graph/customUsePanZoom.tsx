/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * This file was ported from the usePanZoom.tsx file from @patternfly/topology
 * this will be contributed to the library upstream.
 */
import {
  ATTR_DATA_KIND,
  ElementContext,
  Graph,
  GRAPH_AREA_DRAGGING_EVENT,
  isGraph,
  ModelKind,
  Point,
  useCallbackRef,
} from '@patternfly/react-topology';
import * as d3 from 'd3';
import { action, autorun, IReactionDisposer } from 'mobx';
import { observer } from 'mobx-react';
import { useContext, useEffect, useRef, useState } from 'react';

export type PanZoomRef = (node: SVGGElement | null) => void;

export interface PanZoomOptions {
  enableSpacebarPanning?: boolean;
}

// Used to send events prevented by d3.zoom to the document allowing modals, dropdowns, etc, to close
const propagatePanZoomMouseEvent = (e: Event): void => {
  document.dispatchEvent(new MouseEvent(e.type, e));
};

export const usePanZoom = (options: PanZoomOptions = {}): PanZoomRef => {
  const { enableSpacebarPanning = false } = options;
  const element = useContext(ElementContext);
  if (!isGraph(element)) {
    throw new Error('usePanZoom must be used within the scope of a Graph');
  }
  const elementRef = useRef<Graph>(element);
  elementRef.current = element;

  // State for spacebar panning
  const [isSpacebarPressed, setIsSpacebarPressed] = useState(false);
  const lastMousePositionRef = useRef<{ x: number; y: number } | null>(null);
  const isPanningRef = useRef(false);

  // Spacebar event handlers (only if enabled)
  useEffect(() => {
    if (!enableSpacebarPanning) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only activate spacebar panning if spacebar is pressed and not in an input field
      if (event.code === 'Space' && !isInputElement(event.target)) {
        event.preventDefault();
        setIsSpacebarPressed(true);
        document.body.style.cursor = 'grab';
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setIsSpacebarPressed(false);
        lastMousePositionRef.current = null;
        isPanningRef.current = false;
        document.body.style.cursor = '';
      }
    };

    // Helper to check if target is an input element
    const isInputElement = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || target.isContentEditable;
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    globalThis.addEventListener('keyup', handleKeyUp);

    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown);
      globalThis.removeEventListener('keyup', handleKeyUp);
      document.body.style.cursor = '';
    };
  }, [enableSpacebarPanning]);

  return useCallbackRef<PanZoomRef>((node: SVGGElement | null) => {
    let disposeListener: IReactionDisposer | undefined;
    let handleMouseMove: ((event: MouseEvent) => void) | undefined;
    let handleMouseUp: (() => void) | undefined;
    let handleMouseLeave: (() => void) | undefined;

    if (node) {
      // TODO fix any type
      const $svg = d3.select(node.ownerSVGElement) as any;
      if (node?.ownerSVGElement) {
        node.ownerSVGElement.addEventListener('mousedown', propagatePanZoomMouseEvent);
        node.ownerSVGElement.addEventListener('click', propagatePanZoomMouseEvent);

        // Spacebar panning: handle mouse movement (only if enabled)
        if (enableSpacebarPanning) {
          handleMouseMove = (event: MouseEvent) => {
            if (isSpacebarPressed) {
              if (!lastMousePositionRef.current) {
                lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
                return;
              }

              const deltaX = event.clientX - lastMousePositionRef.current.x;
              const deltaY = event.clientY - lastMousePositionRef.current.y;

              if (!isPanningRef.current && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
                isPanningRef.current = true;
                elementRef.current
                  .getController()
                  .fireEvent(GRAPH_AREA_DRAGGING_EVENT, { graph: elementRef.current, isDragging: true });
                document.body.style.cursor = 'grabbing';
              }

              if (isPanningRef.current) {
                const currentBounds = elementRef.current.getBounds();
                const newX = currentBounds.x + deltaX;
                const newY = currentBounds.y + deltaY;

                elementRef.current.setPosition(new Point(newX, newY));

                lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
              }
            }
          };

          handleMouseUp = () => {
            if (isPanningRef.current) {
              isPanningRef.current = false;
              elementRef.current
                .getController()
                .fireEvent(GRAPH_AREA_DRAGGING_EVENT, { graph: elementRef.current, isDragging: false });
              if (isSpacebarPressed) {
                document.body.style.cursor = 'grab';
              }
            }
          };

          handleMouseLeave = () => {
            lastMousePositionRef.current = null;
            if (isPanningRef.current) {
              isPanningRef.current = false;
              elementRef.current
                .getController()
                .fireEvent(GRAPH_AREA_DRAGGING_EVENT, { graph: elementRef.current, isDragging: false });
            }
          };

          node.ownerSVGElement.addEventListener('mousemove', handleMouseMove);
          node.ownerSVGElement.addEventListener('mouseup', handleMouseUp);
          node.ownerSVGElement.addEventListener('mouseleave', handleMouseLeave);
        }
      }
      const zoom = d3
        .zoom()
        .scaleExtent(elementRef.current.getScaleExtent())
        .on(
          'zoom',
          action((event: d3.D3ZoomEvent<any, any>) => {
            if (event.sourceEvent?.type === 'mousemove') {
              elementRef.current
                .getController()
                .fireEvent(GRAPH_AREA_DRAGGING_EVENT, { graph: elementRef.current, isDragging: true });
            }
            elementRef.current.setPosition(new Point(event.transform.x, event.transform.y));
            elementRef.current.setScale(event.transform.k);
          }),
        )
        .on(
          'end',
          action(() => {
            elementRef.current
              .getController()
              .fireEvent(GRAPH_AREA_DRAGGING_EVENT, { graph: elementRef.current, isDragging: false });
          }),
        )
        .filter((event: React.MouseEvent) => {
          if (event.ctrlKey || event.shiftKey || event.altKey || event.button) {
            return false;
          }
          // only allow zoom from double clicking the graph directly
          if (event.type === 'dblclick') {
            // check if target is not within a node or edge
            const svg = node.ownerSVGElement;
            let p: EventTarget | ParentNode | null | undefined = event.target;
            while (p && p !== svg) {
              if (p instanceof Element) {
                const kind = p.getAttribute(ATTR_DATA_KIND);
                if (kind) {
                  if (kind !== ModelKind.graph) {
                    return false;
                  }
                  break;
                }
              }
              p = p instanceof Node ? p.parentNode : undefined;
            }
          }
          return true;
        });
      zoom($svg);

      // Update the d3 transform whenever the scale or bounds change.
      // This is kinda hacky because when d3 has already made the most recent transform update,
      // we listen for the model change, due to the above, only to update the d3 transform again.
      disposeListener = autorun(() => {
        const scale = elementRef.current.getScale();
        const scaleExtent = elementRef.current.getScaleExtent();

        // update the min scaling value such that the user can zoom out to the new scale in case
        // it is smaller than the default zoom out scale
        zoom.scaleExtent([Math.min(scale, scaleExtent[0]), scaleExtent[1]]);
        const b = elementRef.current.getBounds();

        // update d3 zoom data directly

        Object.assign($svg.node().__zoom, {
          k: scale,
          x: b.x,
          y: b.y,
        });
      });

      // disable double click zoom
      // $svg.on('dblclick.zoom', null);
    }
    return () => {
      disposeListener?.();
      if (node) {
        // remove all zoom listeners
        d3.select(node.ownerSVGElement).on('.zoom', null);
        if (node.ownerSVGElement) {
          node.ownerSVGElement.removeEventListener('mousedown', propagatePanZoomMouseEvent);
          node.ownerSVGElement.removeEventListener('click', propagatePanZoomMouseEvent);
          // Remove spacebar panning listeners
          if (handleMouseMove) {
            node.ownerSVGElement.removeEventListener('mousemove', handleMouseMove);
          }
          if (handleMouseUp) {
            node.ownerSVGElement.removeEventListener('mouseup', handleMouseUp);
          }
          if (handleMouseLeave) {
            node.ownerSVGElement.removeEventListener('mouseleave', handleMouseLeave);
          }
        }
      }
    };
  });
};
export interface WithPanZoomProps {
  panZoomRef?: PanZoomRef;
}

export const withCustomPanZoom =
  (options?: PanZoomOptions) =>
  <P extends WithPanZoomProps>(WrappedComponent: React.ComponentType<P>) => {
    const Component: React.FunctionComponent<Omit<P, keyof WithPanZoomProps>> = (props) => {
      const panZoomRef = usePanZoom(options);
      return <WrappedComponent {...(props as any)} panZoomRef={panZoomRef} />;
    };
    Component.displayName = `withPanZoom(${WrappedComponent.displayName || WrappedComponent.name})`;
    return observer(Component);
  };
