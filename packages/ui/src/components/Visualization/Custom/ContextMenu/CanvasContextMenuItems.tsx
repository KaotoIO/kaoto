import { Menu, MenuContent, MenuItem, MenuList, Popper } from '@patternfly/react-core';
import { createContext, KeyboardEvent, PropsWithChildren, ReactNode, useContext, useMemo } from 'react';

const CanvasMenuCloseContext = createContext<() => void>(() => {});

const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
  // Let native button activation run without reopening an ancestor flyout.
  if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
  if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  const target = event.target as HTMLElement;
  const list = target.closest('ul');
  if (!list) return;
  const items = Array.from(list.children)
    .map((item) => item.firstElementChild)
    .filter(
      (item): item is HTMLElement =>
        item instanceof HTMLElement && item.matches('button:not(:disabled):not([aria-disabled="true"])'),
    );
  const current = items.indexOf(target);
  if (current < 0) return;
  event.preventDefault();
  event.stopPropagation();
  let next = (current + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = items.length - 1;
  items[next].focus();
};

/** Scope navigation to this menu and close the entire context menu only for leaf actions. */
export const CanvasContextMenuItems = ({ children }: PropsWithChildren) => {
  const closeMenu = useContext(CanvasMenuCloseContext);
  return (
    <Menu
      containsFlyout
      style={{ width: 'max-content', maxWidth: '30rem' }}
      onKeyDown={handleMenuKeyDown}
      onSelect={(event) => {
        if (!(event?.target instanceof Element) || !event.target.closest('[aria-haspopup="menu"]')) closeMenu();
      }}
    >
      <MenuContent>{children}</MenuContent>
    </Menu>
  );
};

export const CanvasContextSubMenu = ({ label, children, ...props }: PropsWithChildren<{ label: ReactNode }>) => (
  <MenuItem
    {...props}
    onKeyDownCapture={(event) => {
      const trigger = event.currentTarget.firstElementChild;
      if (
        event.key === 'ArrowLeft' &&
        trigger instanceof HTMLElement &&
        event.target instanceof Element &&
        event.target.closest('.pf-v6-c-menu') === trigger.nextElementSibling
      ) {
        // Hovered flyouts have no PatternFly return-focus target.
        trigger.focus();
      }
      if (
        event.target !== trigger ||
        trigger?.getAttribute('aria-expanded') !== 'true' ||
        !['Enter', ' ', 'ArrowRight'].includes(event.key)
      )
        return;
      // PatternFly only transfers focus when opening a closed flyout, not a hovered one.
      event.preventDefault();
      event.stopPropagation();
      trigger.nextElementSibling
        ?.querySelector<HTMLElement>('button:not(:disabled):not([aria-disabled="true"])')
        ?.focus();
    }}
    flyoutMenu={
      <CanvasContextMenuItems>
        <MenuList>{children}</MenuList>
      </CanvasContextMenuItems>
    }
  >
    {label}
  </MenuItem>
);

export const CanvasContextMenu = ({
  reference,
  onRequestClose,
  children,
}: PropsWithChildren<{
  reference: { x: number; y: number };
  onRequestClose: () => void;
}>) => {
  const triggerRef = useMemo(
    () => ({ current: { getBoundingClientRect: () => new DOMRect(reference.x, reference.y, 0, 0) } }),
    [reference],
  );
  return (
    <Popper
      triggerRef={triggerRef}
      placement="bottom-start"
      minWidth="max-content"
      isVisible
      preventOverflow
      onDocumentClick={(event, _trigger, popper) => {
        if (event?.target instanceof Node && !popper?.contains(event.target)) onRequestClose();
      }}
      onDocumentKeyDown={(event) => {
        if (event?.key === 'Escape') onRequestClose();
      }}
      popper={
        <div data-testid="canvas-context-menu">
          <CanvasMenuCloseContext.Provider value={onRequestClose}>
            <CanvasContextMenuItems>{children}</CanvasContextMenuItems>
          </CanvasMenuCloseContext.Provider>
        </div>
      }
    />
  );
};
