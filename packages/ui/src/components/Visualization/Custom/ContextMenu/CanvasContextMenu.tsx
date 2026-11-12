import './CanvasContextMenu.scss';

import { Menu, MenuContent, MenuItem, MenuList, MenuProps, Popper } from '@patternfly/react-core';
import {
  ComponentPropsWithRef,
  createContext,
  KeyboardEvent,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from 'react';

/** Only include the current list, never the items in an open flyout. */
function enabledMenuItems(list: Element) {
  return Array.from(list.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(
    (item) => item.closest('[role="menu"]') === list && !item.matches(':disabled, [aria-disabled="true"]'),
  );
}

function moveMenuFocus(event: KeyboardEvent, list: Element) {
  const items = enabledMenuItems(list);
  const index = items.indexOf(event.target as HTMLElement);
  let next: number;
  switch (event.key) {
    case 'ArrowDown':
      next = (index + 1) % items.length;
      break;
    case 'ArrowUp':
      next = (index - 1 + items.length) % items.length;
      break;
    case 'Home':
      next = 0;
      break;
    case 'End':
      next = items.length - 1;
      break;
    default:
      return false;
  }
  event.preventDefault();
  event.stopPropagation();
  items[next]?.focus();
  return true;
}

const MenuCloseContext = createContext<(() => void) | undefined>(undefined);

const SubmenuButton = (props: ComponentPropsWithRef<'button'>) => <button type="button" {...props} role="menuitem" />;

/** PatternFly flyouts share the root menu's selection lifecycle. */
export const CanvasContextSubMenu = ({
  label,
  children,
  ...props
}: {
  label: ReactNode;
  children: ReactNode;
  'data-testid'?: string;
}) => {
  const id = useId();
  const close = useContext(MenuCloseContext);
  return (
    <MenuItem
      {...props}
      id={id}
      component={SubmenuButton}
      flyoutMenu={
        <Menu
          containsFlyout
          className="canvas-context-menu"
          onSelect={(event) => {
            if (!(event?.target as HTMLElement)?.closest('[aria-haspopup="menu"]')) close?.();
          }}
        >
          <MenuContent>
            <MenuList aria-labelledby={id}>{children}</MenuList>
          </MenuContent>
        </Menu>
      }
    >
      {label}
    </MenuItem>
  );
};

interface CanvasContextMenuProps {
  reference: { x: number; y: number };
  keyboard: boolean;
  label: string;
  onClose: (returnFocus?: boolean) => void;
  onTab: () => void;
  children: ReactElement[];
}

const CanvasMenuContent = ({
  keyboard,
  label,
  onClose,
  onTab,
  children,
  ...menuProps
}: Omit<CanvasContextMenuProps, 'reference'> & Pick<MenuProps, 'style' | 'className'>) => {
  const root = useRef<HTMLDivElement>(null);
  const flyoutFrame = useRef<number | undefined>(undefined);
  const focusFlyout = (trigger: HTMLElement) => {
    if (flyoutFrame.current !== undefined) cancelAnimationFrame(flyoutFrame.current);
    flyoutFrame.current = requestAnimationFrame(() => {
      flyoutFrame.current = undefined;
      if (!root.current?.contains(trigger)) return;
      const list = trigger.nextElementSibling?.querySelector('[role="menu"]');
      if (list) enabledMenuItems(list)[0]?.focus();
    });
  };

  useEffect(() => {
    const list = root.current?.querySelector<HTMLElement>('[role="menu"]');
    if (list) (keyboard ? (enabledMenuItems(list)[0] ?? list) : list).focus({ preventScroll: true });
    const onMouseDown = (event: globalThis.MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) onClose(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !root.current?.contains(event.target as Node)) {
        const ownsFocus = root.current?.contains(document.activeElement) ?? false;
        if (ownsFocus) {
          event.preventDefault();
          event.stopPropagation();
        }
        onClose(ownsFocus);
      }
    };
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      if (flyoutFrame.current !== undefined) cancelAnimationFrame(flyoutFrame.current);
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [keyboard, onClose]);

  const onKeyDownCapture = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const list = target.closest('[role="menu"]');
    if (!list) return;
    if (moveMenuFocus(event, list)) return;
    switch (event.key) {
      case 'Tab':
        onTab();
        event.stopPropagation();
        break;
      case 'ArrowLeft':
      case 'Escape':
        event.preventDefault();
        if (list !== root.current?.querySelector('[role="menu"]')) {
          // Let the owning PatternFly flyout consume the key and close itself.
          list.closest('li')?.querySelector<HTMLElement>(':scope > [aria-haspopup="menu"]')?.focus();
        } else {
          event.stopPropagation();
          if (event.key === 'Escape') onClose();
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        event.stopPropagation();
        if (target.matches('[aria-haspopup="menu"]')) {
          if (target.getAttribute('aria-expanded') !== 'true') target.click();
          focusFlyout(target);
        }
        break;
      case 'Enter':
      case ' ':
        // Let the native button activate once; bypass PatternFly's additional key handler.
        event.stopPropagation();
        break;
    }
  };

  return (
    // Topology's compatibility class forces position: initial !important on the menu.
    // Keep Popper positioning on its own HTML container outside the SVG canvas.
    <div {...menuProps}>
      <Menu
        ref={root}
        containsFlyout
        className="pf-topology-context-menu__c-dropdown__menu canvas-context-menu"
        onKeyDownCapture={onKeyDownCapture}
        onClickCapture={(event) => {
          const trigger = (event.target as HTMLElement).closest<HTMLElement>('[aria-haspopup="menu"]');
          if (trigger && event.detail === 0) focusFlyout(trigger);
        }}
        onSelect={(event) => {
          if (!(event?.target as HTMLElement)?.closest('[aria-haspopup="menu"]')) onClose();
        }}
      >
        <MenuCloseContext.Provider value={onClose}>
          <MenuContent>
            <MenuList aria-label={label} tabIndex={-1}>
              {children}
            </MenuList>
          </MenuContent>
        </MenuCloseContext.Provider>
      </Menu>
    </div>
  );
};

export const CanvasContextMenu = ({ reference, ...props }: CanvasContextMenuProps) => {
  const triggerRef = useMemo(
    () => ({
      current: {
        getBoundingClientRect: () => new DOMRect(reference.x, reference.y, 0, 0),
      },
    }),
    [reference],
  );
  return (
    <Popper
      triggerRef={triggerRef}
      appendTo={() => document.body}
      placement="bottom-start"
      isVisible
      popper={<CanvasMenuContent {...props} />}
    />
  );
};
