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

// Mock @patternfly/react-icons to avoid ESM resolution issues
vi.mock('@patternfly/react-icons', () =>
  oncePerWorker('@patternfly/react-icons', () => {
    const React = require('react');
    const createMockIcon = (name: string) => (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement('svg', { 'data-testid': name, role: 'img', ...props }, React.createElement('path'));
    return {
      AddCircleOIcon: createMockIcon('add-circle-o-icon'),
      AngleDoubleDownIcon: createMockIcon('angle-double-down-icon'),
      AngleDoubleLeftIcon: createMockIcon('angle-double-left-icon'),
      AngleDoubleRightIcon: createMockIcon('angle-double-right-icon'),
      AngleDoubleUpIcon: createMockIcon('angle-double-up-icon'),
      AngleDownIcon: createMockIcon('angle-down-icon'),
      AngleRightIcon: createMockIcon('angle-right-icon'),
      ArrowDownIcon: createMockIcon('arrow-down-icon'),
      ArrowLeftIcon: createMockIcon('arrow-left-icon'),
      ArrowRightIcon: createMockIcon('arrow-right-icon'),
      ArrowUpIcon: createMockIcon('arrow-up-icon'),
      BanIcon: createMockIcon('ban-icon'),
      BarsIcon: createMockIcon('bars-icon'),
      BlueprintIcon: createMockIcon('blueprint-icon'),
      BoltIcon: createMockIcon('bolt-icon'),
      BugIcon: createMockIcon('bug-icon'),
      CatalogIcon: createMockIcon('catalog-icon'),
      CheckCircleIcon: createMockIcon('check-circle-icon'),
      CheckIcon: createMockIcon('check-icon'),
      CodeBranchIcon: createMockIcon('code-branch-icon'),
      CodeIcon: createMockIcon('code-icon'),
      CompressArrowsAltIcon: createMockIcon('compress-arrows-alt-icon'),
      CopyIcon: createMockIcon('copy-icon'),
      CubesIcon: createMockIcon('cubes-icon'),
      DataSourceIcon: createMockIcon('data-source-icon'),
      DownloadIcon: createMockIcon('download-icon'),
      EditIcon: createMockIcon('edit-icon'),
      EllipsisVIcon: createMockIcon('ellipsis-v-icon'),
      ExchangeAltIcon: createMockIcon('exchange-alt-icon'),
      ExclamationCircleIcon: createMockIcon('exclamation-circle-icon'),
      ExclamationTriangleIcon: createMockIcon('exclamation-triangle-icon'),
      ExpandArrowsAltIcon: createMockIcon('expand-arrows-alt-icon'),
      ExpandIcon: createMockIcon('expand-icon'),
      ExportIcon: createMockIcon('export-icon'),
      ExternalLinkAltIcon: createMockIcon('external-link-alt-icon'),
      EyeIcon: createMockIcon('eye-icon'),
      EyeSlashIcon: createMockIcon('eye-slash-icon'),
      FileImportIcon: createMockIcon('file-import-icon'),
      FilterIcon: createMockIcon('filter-icon'),
      FireIcon: createMockIcon('fire-icon'),
      GithubIcon: createMockIcon('github-icon'),
      GripHorizontalIcon: createMockIcon('grip-horizontal-icon'),
      HelpIcon: createMockIcon('help-icon'),
      ImageIcon: createMockIcon('image-icon'),
      ImportIcon: createMockIcon('import-icon'),
      LayerGroupIcon: createMockIcon('layer-group-icon'),
      LightbulbIcon: createMockIcon('lightbulb-icon'),
      ListIcon: createMockIcon('list-icon'),
      PasteIcon: createMockIcon('paste-icon'),
      PencilAltIcon: createMockIcon('pencil-alt-icon'),
      PlusCircleIcon: createMockIcon('plus-circle-icon'),
      PlusIcon: createMockIcon('plus-icon'),
      PortIcon: createMockIcon('port-icon'),
      PowerOffIcon: createMockIcon('power-off-icon'),
      QuestionCircleIcon: createMockIcon('question-circle-icon'),
      QuestionIcon: createMockIcon('question-icon'),
      RedoIcon: createMockIcon('redo-icon'),
      SearchIcon: createMockIcon('search-icon'),
      SearchMinusIcon: createMockIcon('search-minus-icon'),
      SearchPlusIcon: createMockIcon('search-plus-icon'),
      SpinnerIcon: createMockIcon('spinner-icon'),
      SyncAltIcon: createMockIcon('sync-alt-icon'),
      TimesCircleIcon: createMockIcon('times-circle-icon'),
      TimesIcon: createMockIcon('times-icon'),
      TrashIcon: createMockIcon('trash-icon'),
      UndoIcon: createMockIcon('undo-icon'),
      UnknownIcon: createMockIcon('unknown-icon'),
      WarningTriangleIcon: createMockIcon('warning-triangle-icon'),
      WrenchIcon: createMockIcon('wrench-icon'),
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
