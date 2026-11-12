import { ElementContext, GraphElement, observer, WithContextMenuProps } from '@patternfly/react-topology';
import {
  ComponentType,
  FunctionComponent,
  MouseEvent,
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { useCanvasFocusReturn } from '../../Canvas/canvas-focus-handoff';
import { CanvasContextMenu } from './CanvasContextMenu';

interface OpenMenu {
  /** Increases on every invocation, so each open mounts its own menu. */
  id: number;
  reference: { x: number; y: number };
  keyboard: boolean;
  origin: HTMLElement | SVGElement;
}

let dismissActiveMenu: (() => void) | undefined;

/**
 * Adds a context menu to a canvas node or group, in place of PatternFly's `withContextMenu`.
 *
 * It injects the same `onContextMenu` and `contextMenuOpen` props, with two differences that keep the menu's DOM
 * stable while it is open (KaotoIO/kaoto#3529):
 * - the actions are built synchronously in the render that opens the menu, instead of after a promise, so the menu
 *   never swaps a spinner for the items and PatternFly never remounts it;
 * - every right-click gets its own menu instance, so a right-click while a menu is already open removes the previous
 *   items at once instead of leaving them clickable until the new actions arrive.
 */
export const withNodeContextMenu =
  <E extends GraphElement>(actions: (element: E) => ReactElement[], { canvasBackground = false } = {}) =>
  <P extends WithContextMenuProps>(WrappedComponent: ComponentType<P>) => {
    const Component: FunctionComponent<Omit<P, keyof WithContextMenuProps>> = (props) => {
      const element = useContext(ElementContext) as E;
      const [menu, setMenu] = useState<OpenMenu | null>(null);
      /** Counts every open, independently of the close that a `mousedown` may queue in the same event batch */
      const openCount = useRef(0);
      const returnFocus = useCanvasFocusReturn();
      const dismiss = useCallback(() => {
        setMenu(null);
        if (dismissActiveMenu === dismiss) dismissActiveMenu = undefined;
      }, []);
      useEffect(
        () => () => {
          if (dismissActiveMenu === dismiss) dismissActiveMenu = undefined;
        },
        [dismiss],
      );

      const open = useCallback(
        (event: MouseEvent | globalThis.KeyboardEvent, trigger: HTMLElement | SVGElement) => {
          event.preventDefault();
          event.stopPropagation();
          dismissActiveMenu?.();
          dismissActiveMenu = dismiss;
          openCount.current += 1;
          const origin = canvasBackground
            ? (trigger.closest<HTMLDivElement>(`#${CanvasDefaults.CANVAS_MAIN_ID}`) ?? trigger)
            : trigger;
          const keyboard = event.type === 'keydown';
          const rect = origin.getBoundingClientRect();
          const drawingSurface = canvasBackground
            ? origin.querySelector('.pf-topology-content')?.getBoundingClientRect()
            : undefined;
          setMenu({
            id: openCount.current,
            reference: keyboard
              ? {
                  x: drawingSurface?.left ?? rect.left,
                  y: canvasBackground ? (drawingSurface?.top ?? rect.top) : rect.bottom,
                }
              : { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY },
            keyboard,
            origin,
          });
        },
        [dismiss],
      );
      const onContextMenu = useCallback(
        (event: MouseEvent) => {
          open(event, event.currentTarget as HTMLElement | SVGElement);
        },
        [open],
      );
      useEffect(() => {
        if (!canvasBackground) return;
        const onKeyDown = (event: globalThis.KeyboardEvent) => {
          if (
            (event.target as HTMLElement)?.id === CanvasDefaults.CANVAS_MAIN_ID &&
            (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))
          ) {
            open(event, event.target as HTMLElement);
          }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
          document.removeEventListener('keydown', onKeyDown);
        };
      }, [open]);

      const onRequestClose = useCallback(
        (restore = true) => {
          if (restore && menu) returnFocus(menu.origin);
          dismiss();
        },
        [dismiss, menu, returnFocus],
      );
      const onTab = () => {
        menu?.origin.focus({ preventScroll: true });
        dismiss();
      };

      const items = useMemo(() => (menu === null ? null : actions(element)), [element, menu]);

      return (
        <>
          <WrappedComponent {...(props as P)} onContextMenu={onContextMenu} contextMenuOpen={menu !== null} />
          {menu !== null && items !== null && (
            <CanvasContextMenu
              key={menu.id}
              reference={menu.reference}
              keyboard={menu.keyboard}
              label={canvasBackground ? 'Canvas actions' : 'Step actions'}
              onClose={onRequestClose}
              onTab={onTab}
            >
              {items}
            </CanvasContextMenu>
          )}
        </>
      );
    };
    Component.displayName = `withNodeContextMenu(${WrappedComponent.displayName ?? WrappedComponent.name})`;

    return observer(Component);
  };
