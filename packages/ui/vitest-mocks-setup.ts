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

// Mock @patternfly/react-icons to avoid ESM resolution issues.
// Kaoto's own code uses @carbon/icons-react; these are the icons imported by @kaoto/forms.
vi.mock('@patternfly/react-icons', () =>
  oncePerWorker('@patternfly/react-icons', () => {
    const React = require('react');
    const createMockIcon = (name: string) => (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement('svg', { 'data-testid': name, role: 'img', ...props }, React.createElement('path'));
    return {
      EllipsisVIcon: createMockIcon('ellipsis-v-icon'),
      ExclamationCircleIcon: createMockIcon('exclamation-circle-icon'),
      EyeIcon: createMockIcon('eye-icon'),
      EyeSlashIcon: createMockIcon('eye-slash-icon'),
      LightbulbIcon: createMockIcon('lightbulb-icon'),
      PencilAltIcon: createMockIcon('pencil-alt-icon'),
      PlusIcon: createMockIcon('plus-icon'),
      PortIcon: createMockIcon('port-icon'),
      TimesIcon: createMockIcon('times-icon'),
      TrashIcon: createMockIcon('trash-icon'),
    };
  }),
);

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
