import { MenuList } from '@patternfly/react-core';
import { ElementContext, GraphElement, isGraph, WithContextMenuProps } from '@patternfly/react-topology';
import {
  ComponentType,
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
import { CanvasContextMenu } from './CanvasContextMenuItems';

type FocusTarget = HTMLElement | SVGElement;
type MenuTriggerEvent = Pick<
  MouseEvent,
  'type' | 'currentTarget' | 'clientX' | 'clientY' | 'preventDefault' | 'stopPropagation'
>;

/** Adds focus management to Topology's context menu while retaining its positioning and menu actions. */
export const withCanvasContextMenu =
  <E extends GraphElement>(actions: (element: E) => ReactElement[]) =>
  <P extends WithContextMenuProps>(WrappedComponent: ComponentType<P>) => {
    const Component = (props: Omit<P, keyof WithContextMenuProps>) => {
      const element = useContext(ElementContext) as E;
      const [reference, setReference] = useState<{ x: number; y: number } | null>(null);
      const triggerRef = useRef<FocusTarget | null>(null);
      const menuRef = useRef<HTMLUListElement | null>(null);
      const openedWithKeyboardRef = useRef(false);

      const onContextMenu = useCallback(
        (event: MenuTriggerEvent) => {
          event.preventDefault();
          event.stopPropagation();
          // The graph background is an unfocusable SVG rect; restore focus to the canvas instead.
          triggerRef.current = isGraph(element)
            ? document.getElementById(CanvasDefaults.CANVAS_MAIN_ID)
            : (event.currentTarget as FocusTarget);
          openedWithKeyboardRef.current = event.type === 'keydown';
          setReference({ x: event.clientX, y: event.clientY });
        },
        [element],
      );

      useEffect(() => {
        if (!isGraph(element)) return;
        const canvas = document.getElementById(CanvasDefaults.CANVAS_MAIN_ID);
        if (!canvas) return;

        const onKeyDown = (event: KeyboardEvent) => {
          if (event.target !== canvas || !((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu'))
            return;
          const surface = canvas.querySelector('.pf-topology-visualization-surface');
          const rect = (surface ?? canvas).getBoundingClientRect();
          onContextMenu({
            type: event.type,
            currentTarget: canvas,
            clientX: rect.left,
            clientY: rect.top,
            preventDefault: event.preventDefault.bind(event),
            stopPropagation: event.stopPropagation.bind(event),
          });
        };
        canvas.addEventListener('keydown', onKeyDown);
        return () => {
          canvas.removeEventListener('keydown', onKeyDown);
        };
      }, [element, onContextMenu]);

      const focusMenu = useCallback((menu: HTMLUListElement | null) => {
        menuRef.current = menu;
        if (menu) {
          const firstItem = openedWithKeyboardRef.current
            ? menu.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled):not([aria-disabled="true"])')
            : null;
          // Mouse invocation keeps keyboard dismissal available without highlighting an action.
          (firstItem ?? menu).focus({ preventScroll: true });
        }
      }, []);

      const closeMenu = useCallback(() => {
        const shouldRestoreFocus = menuRef.current?.contains(document.activeElement);
        const trigger = triggerRef.current;
        setReference(null);
        if (!shouldRestoreFocus) return;

        requestAnimationFrame(() => {
          // An action may open a dialog or an outside click may focus another control.
          const active = document.activeElement;
          if (active !== document.body && active !== trigger && active?.isConnected) return;
          const target = trigger?.isConnected ? trigger : document.getElementById(CanvasDefaults.CANVAS_MAIN_ID);
          target?.focus({ preventScroll: true });
        });
      }, []);

      const menu = useMemo(
        () => (
          <MenuList
            ref={focusMenu}
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === 'Escape') event.stopPropagation();
              if (event.key === 'Tab') {
                triggerRef.current?.focus({ preventScroll: true });
                setReference(null);
              }
            }}
          >
            {reference && actions(element)}
          </MenuList>
        ),
        [element, focusMenu, reference],
      );

      return (
        <>
          <WrappedComponent {...(props as P)} onContextMenu={onContextMenu} contextMenuOpen={!!reference} />
          {reference && (
            <CanvasContextMenu reference={reference} onRequestClose={closeMenu}>
              {menu}
            </CanvasContextMenu>
          )}
        </>
      );
    };
    Component.displayName = `withCanvasContextMenu(${WrappedComponent.displayName || WrappedComponent.name})`;
    return Component;
  };
