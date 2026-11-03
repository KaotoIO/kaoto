import { MenuList } from '@patternfly/react-core';
import { ContextMenu, ElementContext, GraphElement, WithContextMenuProps } from '@patternfly/react-topology';
import { ComponentType, MouseEvent, ReactElement, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { CanvasDefaults } from '../../Canvas/canvas.defaults';

type FocusTarget = HTMLElement | SVGElement;

/** Adds focus management to Topology's context menu while retaining its positioning and menu actions. */
export const withCanvasContextMenu =
  <E extends GraphElement>(actions: (element: E) => ReactElement[]) =>
  <P extends WithContextMenuProps>(WrappedComponent: ComponentType<P>) => {
    const Component = (props: Omit<P, keyof WithContextMenuProps>) => {
      const element = useContext(ElementContext) as E;
      const [reference, setReference] = useState<{ x: number; y: number } | null>(null);
      const triggerRef = useRef<FocusTarget | null>(null);
      const menuRef = useRef<HTMLUListElement | null>(null);

      const onContextMenu = useCallback((event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        triggerRef.current = event.currentTarget as FocusTarget;
        setReference({ x: event.clientX, y: event.clientY });
      }, []);

      const focusMenu = useCallback((menu: HTMLUListElement | null) => {
        menuRef.current = menu;
        if (menu) {
          const firstItem = menu.querySelector<HTMLElement>(
            '[role="menuitem"]:not(:disabled):not([aria-disabled="true"])',
          );
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
            <ContextMenu reference={reference} open onRequestClose={closeMenu}>
              {menu}
            </ContextMenu>
          )}
        </>
      );
    };
    Component.displayName = `withCanvasContextMenu(${WrappedComponent.displayName || WrappedComponent.name})`;
    return Component;
  };
