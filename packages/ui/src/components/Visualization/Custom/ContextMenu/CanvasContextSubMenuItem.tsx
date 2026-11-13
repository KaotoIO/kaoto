import { ChevronRight } from '@carbon/icons-react';
import { Menu, MenuContent, MenuList, Popper } from '@patternfly/react-core';
import { FunctionComponent, KeyboardEvent, ReactNode, useContext, useId, useRef, useState } from 'react';

import { ContextMenuControlsContext, ENABLED_ITEM, SUBMENU_ATTRIBUTE } from './withNodeContextMenu';

interface CanvasContextSubMenuItemProps {
  label: ReactNode;
  children: ReactNode;
  'data-testid'?: string;
}

const focusFirstItem = (list: HTMLUListElement | null) => {
  list?.querySelector<HTMLElement>(ENABLED_ITEM)?.focus();
};

/**
 * A context menu entry that opens a submenu, in place of PatternFly Topology's `ContextSubMenuItem`, which can be
 * used neither with the keyboard nor with a screen reader.
 *
 * The submenu opens on hover, and with ArrowRight, Enter, Space (on release) or a click, which also focus its first
 * action. ArrowLeft and Escape close only the submenu and focus the entry again; choosing an action closes the whole
 * menu.
 *
 * The submenu is placed next to the menu the entry belongs to, inside the context menu's popper: clicking it is no
 * click outside the context menu, and the parent `Menu` does not take over its arrow keys. Being a React child of the
 * entry, moving the pointer onto the submenu does not leave the entry.
 *
 * The submenu is labelled by its entry with `aria-labelledby`. It is marked with `SUBMENU_ATTRIBUTE`, which tells the
 * context menu to leave Escape to it.
 */
export const CanvasContextSubMenuItem: FunctionComponent<CanvasContextSubMenuItemProps> = ({
  label,
  children,
  'data-testid': dataTestId,
}) => {
  const contextMenu = useContext(ContextMenuControlsContext);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [open, setOpen] = useState<false | 'hover' | 'focus'>(false);

  const onTriggerKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      // Space opens on keyup, like a button: Firefox clicks the focused element on keyup, the submenu's first action
      if (event.key !== ' ') setOpen('focus');
    }
  };

  const onTriggerKeyUp = (event: KeyboardEvent) => {
    if (event.key === ' ') setOpen('focus');
  };

  const onSubMenuKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft' || event.key === 'Escape') {
      // Neither the parent menus nor the canvas handle these keys any more
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') contextMenu.keepOpenOnEscape();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <li
      className="pf-v6-c-menu__list-item"
      role="none"
      data-testid={dataTestId}
      onMouseEnter={() => {
        setOpen((current) => current || 'hover');
      }}
      onMouseLeave={(event) => {
        // Like PatternFly's `ContextSubMenuItem`, the submenu stays open when the pointer leaves the window
        if (event.relatedTarget instanceof Node) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="menuitem"
        tabIndex={-1}
        className="pf-v6-c-menu__item"
        aria-haspopup="menu"
        aria-expanded={open !== false}
        onClick={() => {
          setOpen('focus');
        }}
        onKeyDown={onTriggerKeyDown}
        onKeyUp={onTriggerKeyUp}
      >
        <span className="pf-v6-c-menu__item-main">
          <span className="pf-v6-c-menu__item-text">{label}</span>
          <span className="pf-v6-c-menu__item-toggle-icon">
            <ChevronRight />
          </span>
        </span>
      </button>

      {open && (
        <Popper
          triggerRef={triggerRef}
          placement="right-start"
          appendTo={() => contextMenu.getContainer() ?? document.body}
          popper={
            <Menu onSelect={contextMenu.close} onKeyDown={onSubMenuKeyDown}>
              <MenuContent>
                <MenuList
                  aria-labelledby={id}
                  {...{ [SUBMENU_ATTRIBUTE]: '' }}
                  ref={open === 'focus' ? focusFirstItem : undefined}
                >
                  {children}
                </MenuList>
              </MenuContent>
            </Menu>
          }
        />
      )}
    </li>
  );
};
