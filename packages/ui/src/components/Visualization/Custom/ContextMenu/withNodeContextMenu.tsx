import { MenuList } from '@patternfly/react-core';
import { ContextMenu, ElementContext, GraphElement, observer, WithContextMenuProps } from '@patternfly/react-topology';
import {
  ComponentProps,
  ComponentType,
  createContext,
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

import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { CanvasNodeData } from '../../Canvas/canvas.models';
import { focusCanvasAfterRender, focusElement, getFocusOrigin } from '../../Canvas/canvas-focus';

interface OpenMenu {
  /** Increases on every right-click, so each open mounts its own `ContextMenu` */
  id: number;
  reference: { x: number; y: number };
  /** The element that had the focus when the menu opened, focused again once the menu closes */
  origin: Element | null;
  /** The model of the step the actions were built for */
  vizNode: IVisualizationNode | undefined;
}

interface NodeContextMenuPopupProps {
  id: OpenMenu['id'];
  label: string;
  reference: OpenMenu['reference'];
  origin: OpenMenu['origin'];
  /** Closes the menu with the given id; a close that comes in after a newer menu opened leaves that menu open */
  onRequestClose: (id: OpenMenu['id']) => void;
  children: ReactElement[];
}

/**
 * `ContextMenu` passes `popperRef` on to its `Popper`, which calls it with the PopperJS instance of the open menu.
 * `ContextMenuProps` does not declare it; should a PatternFly update stop passing it on, the tests for the focus of the
 * first enabled action on open fail.
 */
const ContextMenuWithPopperRef = ContextMenu as FunctionComponent<
  ComponentProps<typeof ContextMenu> & { popperRef: (instance: { popper: HTMLElement } | null) => void }
>;

/** The actions of a menu that can be focused */
export const ENABLED_ITEM = '[role="menuitem"]:not(:disabled):not([aria-disabled="true"])';
/** Marks the submenus of `CanvasContextSubMenuItem`, which close themselves on Escape */
export const SUBMENU_ATTRIBUTE = 'data-canvas-submenu';
const SUBMENU = `[${SUBMENU_ATTRIBUTE}]`;

interface ContextMenuControls {
  /** Closes the whole context menu, for actions in submenus, which have a `Menu` of their own */
  close: () => void;
  /** Called by a submenu that closed itself on Escape, so the context menu stays open */
  keepOpenOnEscape: () => void;
  /** The element of the open context menu, which its submenus are placed in */
  getContainer: () => HTMLElement | null;
}

export const ContextMenuControlsContext = createContext<ContextMenuControls>({
  close: () => {},
  keepOpenOnEscape: () => {},
  getContainer: () => null,
});

/**
 * Mounts PatternFly's `ContextMenu` closed and opens it on the next animation frame.
 *
 * `ContextMenu` closes itself and reopens on the next animation frame whenever its `children` change, and it
 * does so on mount as well when it mounts open. Opening it after the mount, with children that never change,
 * means the items are inserted into the DOM once and stay there until the menu is closed.
 *
 * Once open, the menu takes the focus, so it can be used with the keyboard. PatternFly's `Menu` moves between the
 * actions with the arrow keys; Home and End are added here, and Tab closes the menu like Escape does.
 */
const NodeContextMenuPopup: FunctionComponent<NodeContextMenuPopupProps> = ({
  id,
  label,
  reference,
  origin,
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

  const close = useCallback(() => {
    onRequestClose(id);
    // PatternFly only gives the focus back to HTML elements, not to the SVG steps. It moves back right away, so a
    // dialog opened by the chosen action, like the catalog, finds the step as the element to return to.
    focusElement(origin);
    focusCanvasAfterRender(origin);
  }, [id, onRequestClose, origin]);

  const escapedInSubmenu = useRef(false);
  /** The popper element of the open menu, with the keyboard listener attached to it */
  const attached = useRef<{ popper: HTMLElement; listener: EventListener } | null>(null);
  const controls = useMemo<ContextMenuControls>(
    () => ({
      close,
      keepOpenOnEscape: () => {
        escapedInSubmenu.current = true;
      },
      getContainer: () => attached.current?.popper ?? null,
    }),
    [close],
  );

  /**
   * PatternFly asks to close the menu on Escape anywhere in the document, on a click outside and on choosing an
   * action, always without the event. Escape in a submenu closes only that submenu, but PatternFly asks from a capture
   * listener on the document, before the key reaches the submenu, and closing right away would remove the submenu
   * before it sees the key. So with the focus in a submenu, the menu decides once the event has been dispatched: it
   * closes unless the submenu reported that it handled Escape.
   */
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onContextMenuRequestClose = useCallback(() => {
    if (!document.activeElement?.closest(SUBMENU)) {
      close();
      return;
    }
    escapedInSubmenu.current = false;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (!escapedInSubmenu.current) close();
    });
  }, [close]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // The Popper closes the menu; the canvas must not also clear the selection
        event.stopPropagation();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        close();
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        const menu = (event.target as Element).closest('[role="menu"]') ?? (event.currentTarget as Element);
        const items = menu.querySelectorAll<HTMLElement>(ENABLED_ITEM);
        items[event.key === 'Home' ? 0 : items.length - 1]?.focus();
      }
    },
    [close],
  );

  /** Called with `null` and a new instance whenever PatternFly sets the menu up again, and with `null` on close */
  const popperRef = useCallback(
    (instance: { popper: HTMLElement } | null) => {
      const popper = instance?.popper ?? null;
      const listener = onKeyDown as EventListener;
      if (attached.current?.popper === popper && attached.current.listener === listener) return;

      attached.current?.popper.removeEventListener('keydown', attached.current.listener);
      attached.current = null;
      if (!popper) return;

      popper.addEventListener('keydown', listener);
      attached.current = { popper, listener };
      if (!popper.contains(document.activeElement)) {
        popper.querySelector<HTMLElement>(ENABLED_ITEM)?.focus();
      }
    },
    [onKeyDown],
  );

  useEffect(
    () => () => {
      // A close requested from a submenu must not move the focus once the menu is gone
      clearTimeout(closeTimer.current);
      // A menu removed without closing, because its step got a new model, leaves the focus nowhere
      if (document.activeElement === document.body) {
        focusElement(origin);
      }
    },
    [origin],
  );

  const menuList = useMemo(
    () => (
      <ContextMenuControlsContext.Provider value={controls}>
        <MenuList aria-label={label}>{children}</MenuList>
      </ContextMenuControlsContext.Provider>
    ),
    [controls, label, children],
  );

  return (
    <ContextMenuWithPopperRef
      reference={reference}
      open={open}
      onRequestClose={onContextMenuRequestClose}
      popperRef={popperRef}
    >
      {menuList}
    </ContextMenuWithPopperRef>
  );
};

/** The model of a step or group; the graph has none */
const getVizNode = (element: GraphElement): IVisualizationNode | undefined =>
  (element.getData() as CanvasNodeData | undefined)?.vizNode;

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
  <E extends GraphElement>(
    actions: (element: E) => ReactElement[],
    { label = 'Step actions' }: { label?: string } = {},
  ) =>
  <P extends WithContextMenuProps>(WrappedComponent: ComponentType<P>) => {
    const Component: FunctionComponent<Omit<P, keyof WithContextMenuProps>> = (props) => {
      const element = useContext(ElementContext) as E;
      const vizNode = getVizNode(element);
      const [menu, setMenu] = useState<OpenMenu | null>(null);
      // The actions act on the model they were built for; once the step gets a new one, they could change another step.
      // Setting the state while rendering is intended: React renders again right away, before anything is committed,
      // so the stale actions are never shown. An effect would show them for one render and be one render late.
      if (menu !== null && menu.vizNode !== vizNode) {
        setMenu(null);
      }
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
            origin: getFocusOrigin(),
            vizNode,
          });
        },
        [vizNode],
      );

      const onRequestClose = useCallback((id: OpenMenu['id']) => {
        setMenu((current) => (current?.id === id ? null : current));
      }, []);

      const items = useMemo(() => (menu === null ? null : actions(element)), [element, menu]);

      return (
        <>
          <WrappedComponent {...(props as P)} onContextMenu={onContextMenu} contextMenuOpen={menu !== null} />
          {menu !== null && items !== null && (
            <NodeContextMenuPopup
              key={menu.id}
              id={menu.id}
              label={label}
              reference={menu.reference}
              origin={menu.origin}
              onRequestClose={onRequestClose}
            >
              {items}
            </NodeContextMenuPopup>
          )}
        </>
      );
    };
    Component.displayName = `withNodeContextMenu(${WrappedComponent.displayName ?? WrappedComponent.name})`;

    return observer(Component);
  };
