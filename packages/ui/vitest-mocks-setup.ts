import React from 'react';
import { vi } from 'vitest';

// This file contains all vi.mock() calls and runs before other setup files
// to ensure mocks are properly hoisted

// Setup files run again for every test file, and so do these vi.mock() factories, but modules cached from an earlier
// file of the worker (`isolate: false`) keep the mock instance they imported. Create every mock module once per worker
// so tests and the code under test share the same mock functions and components.
const { oncePerWorker } = vi.hoisted(() => {
  const store = globalThis as typeof globalThis & { __kaotoMockModules?: Map<string, unknown> };
  const instances = (store.__kaotoMockModules ??= new Map<string, unknown>());
  return {
    oncePerWorker: <T>(id: string, create: () => T): T => {
      if (!instances.has(id)) instances.set(id, create());
      return instances.get(id) as T;
    },
  };
});

// Mock Carbon's Toggletip with a passthrough that renders its children but
// avoids activating @floating-ui/react's useFloating (which happens when
// Toggletip's underlying Popover has autoAlign set). In React 19's act(), the
// useFloating → computePosition → flushSync(setData) chain loops indefinitely
// via recursivelyFlushAsyncActWork and prevents tests from settling in jsdom.
//
// @kaoto/forms is inlined by vitest (server.deps.inline in vitest.config.mts),
// so its @carbon/react imports resolve inside this environment. The identical
// mock in @kaoto/forms' own vitest-setup.ts has no effect here.
vi.mock('@carbon/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@carbon/react')>();
  const React = await import('react');

  // MenuButton positions its popup with floating-ui. Unit tests only need its
  // trigger and action callbacks, so avoid the positioning work in jsdom.
  const MockMenuButtonContext = React.createContext<(() => void) | undefined>(undefined);
  const MenuButton = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<typeof actual.MenuButton> & { 'data-testid'?: string }
  >(({ label, children, 'data-testid': testId }, ref) => {
    const [open, setOpen] = React.useState(false);
    return React.createElement(
      'div',
      { ref, 'data-testid': testId },
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => {
            setOpen((previous) => !previous);
          },
        },
        label,
      ),
      open &&
        React.createElement(
          'ul',
          { role: 'menu' },
          React.createElement(
            MockMenuButtonContext.Provider,
            {
              value: () => {
                setOpen(false);
              },
            },
            children,
          ),
        ),
    );
  });
  MenuButton.displayName = 'MenuButton';

  const MenuItem = React.forwardRef<
    HTMLLIElement,
    React.ComponentProps<typeof actual.MenuItem> & { 'data-testid'?: string }
  >((props, ref) => {
    const closeMenu = React.useContext(MockMenuButtonContext);
    if (!closeMenu) {
      return React.createElement(actual.MenuItem, { ...props, ref });
    }

    const { label, children, disabled, onClick, 'data-testid': testId } = props;
    return React.createElement(
      'li',
      {
        ref,
        role: 'menuitem',
        'aria-disabled': disabled || undefined,
        'data-testid': testId,
        onClick: disabled
          ? undefined
          : (event: React.MouseEvent<HTMLLIElement>) => {
              onClick?.(event as never);
              closeMenu();
            },
      },
      label,
      children,
    );
  });
  MenuItem.displayName = 'MenuItem';

  const MenuItemDivider = () =>
    React.useContext(MockMenuButtonContext)
      ? React.createElement('li', { role: 'separator' })
      : React.createElement(actual.MenuItemDivider);
  MenuItemDivider.displayName = 'MenuItemDivider';

  // Simple passthrough: renders children directly, content always visible.
  // ToggletipButton forwards its `label` prop as aria-label so tests using
  // getByLabelText() can still locate the button.
  const Toggletip: React.FC<React.ComponentProps<typeof actual.Toggletip>> = ({ children }) =>
    React.createElement(React.Fragment, null, children);
  Toggletip.displayName = 'Toggletip';

  const ToggletipButton: React.FC<React.ComponentProps<typeof actual.ToggletipButton>> = ({ label, children }) =>
    React.createElement('button', { type: 'button', 'aria-label': label }, children);
  ToggletipButton.displayName = 'ToggletipButton';

  const ToggletipContent: React.FC<React.ComponentProps<typeof actual.ToggletipContent>> = ({ children }) =>
    React.createElement(React.Fragment, null, children);
  ToggletipContent.displayName = 'ToggletipContent';

  // Popover with `autoAlign` activates floating-ui's useFloating, which never settles in jsdom
  // (same problem as Toggletip above). Drop the prop so the popover renders with static positioning.
  const Popover = React.forwardRef<HTMLElement, React.ComponentProps<typeof actual.Popover>>(
    ({ autoAlign: _autoAlign, ...props }, ref) =>
      React.createElement(actual.Popover as React.ElementType, { ...props, ref }),
  );
  Popover.displayName = 'Popover';

  // IconButton with `autoAlign` (used by @kaoto/forms' FieldWrapper) hits the same floating-ui problem.
  const IconButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof actual.IconButton>>(
    ({ autoAlign: _autoAlign, ...props }, ref) =>
      React.createElement(actual.IconButton as React.ElementType, { ...props, ref }),
  );
  IconButton.displayName = 'IconButton';

  return {
    ...actual,
    IconButton,
    MenuButton,
    MenuItem,
    MenuItemDivider,
    Popover,
    Toggletip,
    ToggletipButton,
    ToggletipContent,
  };
});

// Mock hotkeys-js to avoid ESM resolution issues
vi.mock('hotkeys-js', () =>
  oncePerWorker('hotkeys-js', () => {
    const hotkeyMock = Object.assign(vi.fn(), {
      unbind: vi.fn(),
      setScope: vi.fn(),
      getScope: vi.fn(),
      deleteScope: vi.fn(),
      noConflict: vi.fn(),
      filter: vi.fn(),
    });

    return {
      __esModule: true,
      default: hotkeyMock,
    };
  }),
);

// html-to-image renders the DOM through a <canvas>, which jsdom doesn't implement.
// The default implementation is passed to vi.fn() so vi.resetAllMocks() restores it after every file.
vi.mock('html-to-image', () =>
  oncePerWorker('html-to-image', () => ({
    toBlob: vi.fn(() => Promise.resolve(new Blob(['fake-image-data'], { type: 'image/png' }))),
  })),
);
