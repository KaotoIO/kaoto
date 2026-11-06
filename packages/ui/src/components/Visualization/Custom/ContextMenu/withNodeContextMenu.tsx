import { ContextMenu, ElementContext, GraphElement, observer, WithContextMenuProps } from '@patternfly/react-topology';
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

interface OpenMenu {
  /** Increases on every right-click, so each open mounts its own `ContextMenu` */
  id: number;
  reference: { x: number; y: number };
}

interface NodeContextMenuPopupProps {
  reference: OpenMenu['reference'];
  onRequestClose: () => void;
  children: ReactElement[];
}

/**
 * Mounts PatternFly's `ContextMenu` closed and opens it on the next animation frame.
 *
 * `ContextMenu` closes itself and reopens on the next animation frame whenever its `children` change, and it
 * does so on mount as well when it mounts open. Opening it after the mount, with children that never change,
 * means the items are inserted into the DOM once and stay there until the menu is closed.
 */
const NodeContextMenuPopup: FunctionComponent<NodeContextMenuPopupProps> = ({
  reference,
  onRequestClose,
  children,
}) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setOpen(true);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <ContextMenu reference={reference} open={open} onRequestClose={onRequestClose}>
      {children}
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

      const onContextMenu = useCallback((event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        openCount.current += 1;
        setMenu({ id: openCount.current, reference: { x: event.clientX, y: event.clientY } });
      }, []);

      const onRequestClose = useCallback(() => {
        setMenu(null);
      }, []);

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
