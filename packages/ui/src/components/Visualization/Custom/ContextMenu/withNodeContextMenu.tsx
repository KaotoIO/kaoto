import { MenuList } from '@patternfly/react-core';
import { ContextMenu, ElementContext, GraphElement, observer, WithContextMenuProps } from '@patternfly/react-topology';
import {
  ComponentType,
  FunctionComponent,
  KeyboardEvent,
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

interface OpenMenu {
  /** Increases on every right-click, so each open mounts its own `ContextMenu` */
  id: number;
  reference: { x: number; y: number };
  /** The element's data the actions are built from */
  data: unknown;
}

interface NodeContextMenuPopupProps {
  reference: OpenMenu['reference'];
  onRequestClose: () => void;
  children: ReactElement[];
}

const focusFirstItem = (list: HTMLUListElement | null) => {
  list?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
};

/**
 * Mounts PatternFly's `ContextMenu` closed and opens it on the next animation frame.
 *
 * `ContextMenu` closes itself and reopens on the next animation frame whenever its `children` change, and it
 * does so on mount as well when it mounts open. Opening it after the mount, with children that never change,
 * means the items are inserted into the DOM once and stay there until the menu is closed.
 *
 * PatternFly handles the menu keys only while the focus is inside the menu, so the first item takes the focus when
 * the menu opens, and the element that had it gets it back when the menu closes (KaotoIO/kaoto#4429).
 */
const NodeContextMenuPopup: FunctionComponent<NodeContextMenuPopupProps> = ({
  reference,
  onRequestClose,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const origin = useRef<HTMLElement | SVGElement | null>(null);

  useEffect(() => {
    const active = document.activeElement;
    const isElement = active instanceof HTMLElement || active instanceof SVGElement;
    origin.current = isElement && active !== document.body ? active : null;

    const frame = requestAnimationFrame(() => {
      setOpen(true);
    });
    return () => {
      cancelAnimationFrame(frame);
      requestAnimationFrame(() => {
        if (document.activeElement !== document.body) return;
        if (origin.current?.isConnected) {
          /* The menu was closed from outside while it had the focus, like when its element got new data */
          origin.current.focus({ preventScroll: true });
        } else if (origin.current) {
          /* An action may have removed the element that had the focus, like deleting a step */
          document.getElementById(CanvasDefaults.CANVAS_MAIN_ID)?.focus({ preventScroll: true });
        }
      });
    };
  }, []);

  const handleRequestClose = useCallback(() => {
    origin.current?.focus({ preventScroll: true });
    onRequestClose();
  }, [onRequestClose]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        handleRequestClose();
      }
    },
    [handleRequestClose],
  );

  /* Memoized because `ContextMenu` closes and reopens whenever its children change */
  const list = useMemo(
    () => (
      <MenuList aria-label="Context menu" ref={focusFirstItem} onKeyDown={handleKeyDown}>
        {children}
      </MenuList>
    ),
    [children, handleKeyDown],
  );

  return (
    <ContextMenu reference={reference} open={open} onRequestClose={handleRequestClose}>
      {list}
    </ContextMenu>
  );
};

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
  <E extends GraphElement>(actions: (element: E) => ReactElement[]) =>
  <P extends WithContextMenuProps>(WrappedComponent: ComponentType<P>) => {
    const Component: FunctionComponent<Omit<P, keyof WithContextMenuProps>> = (props) => {
      const element = useContext(ElementContext) as E;
      const [menu, setMenu] = useState<OpenMenu | null>(null);
      /** Counts every open, independently of the close that a `mousedown` may queue in the same event batch */
      const openCount = useRef(0);

      const onContextMenu = useCallback(
        (event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          openCount.current += 1;
          setMenu({
            id: openCount.current,
            reference: { x: event.clientX, y: event.clientY },
            data: element.getData(),
          });
        },
        [element],
      );

      const onRequestClose = useCallback(() => {
        setMenu(null);
      }, []);

      /*
       * The canvas stays mounted across a model update, which keeps the element and replaces its data. The actions of
       * an open menu were built from the previous data and would act on the previous model, so the menu closes.
       */
      const data: unknown = element.getData();
      if (menu !== null && menu.data !== data) {
        setMenu(null);
      }

      const items = useMemo(() => (menu === null ? null : actions(element)), [element, menu]);

      return (
        <>
          <WrappedComponent {...(props as P)} onContextMenu={onContextMenu} contextMenuOpen={menu !== null} />
          {menu !== null && items !== null && (
            <NodeContextMenuPopup key={menu.id} reference={menu.reference} onRequestClose={onRequestClose}>
              {items}
            </NodeContextMenuPopup>
          )}
        </>
      );
    };
    Component.displayName = `withNodeContextMenu(${WrappedComponent.displayName ?? WrappedComponent.name})`;

    return observer(Component);
  };
