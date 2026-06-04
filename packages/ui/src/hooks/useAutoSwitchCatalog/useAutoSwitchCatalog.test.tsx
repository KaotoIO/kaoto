import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { renderHook } from '@testing-library/react';

import { SourceSchemaType } from '../../models/camel';
import { useAutoSwitchCatalog } from './useAutoSwitchCatalog';

const mockSetSelectedCatalog = jest.fn();
const mockUseEntityContext = jest.fn();
const mockUseRuntimeContext = jest.fn();

jest.mock('../useEntityContext/useEntityContext', () => ({
  useEntityContext: () => mockUseEntityContext(),
}));

jest.mock('../useRuntimeContext/useRuntimeContext', () => ({
  useRuntimeContext: () => mockUseRuntimeContext(),
}));

describe('useAutoSwitchCatalog', () => {
  const mainCatalog: CatalogLibraryEntry = {
    name: 'camel-main',
    version: '4.10.0',
    runtime: 'Main',
    fileName: 'index.json',
  };

  const citrusCatalog: CatalogLibraryEntry = {
    name: 'citrus-4.10.0',
    version: '4.10.0',
    runtime: 'Citrus',
    fileName: 'citrus-index.json',
  };

  const catalogLibrary = {
    definitions: [mainCatalog, citrusCatalog],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEntityContext.mockReturnValue({
      currentSchemaType: SourceSchemaType.Route,
    });
    mockUseRuntimeContext.mockReturnValue({
      basePath: '',
      catalogLibrary,
      selectedCatalog: mainCatalog,
      setSelectedCatalog: mockSetSelectedCatalog,
    });
  });

  it('should not switch catalog when schema type matches selected catalog', () => {
    renderHook(() => useAutoSwitchCatalog());
    expect(mockSetSelectedCatalog).not.toHaveBeenCalled();
  });

  it('should switch to Citrus catalog when schema type is Test and current catalog is Main', () => {
    mockUseEntityContext.mockReturnValue({
      currentSchemaType: SourceSchemaType.Test,
    });

    renderHook(() => useAutoSwitchCatalog());
    expect(mockSetSelectedCatalog).toHaveBeenCalledWith(citrusCatalog);
  });

  it('should switch to Main catalog when schema type is Route and current catalog is Citrus', () => {
    mockUseRuntimeContext.mockReturnValue({
      basePath: '',
      catalogLibrary,
      selectedCatalog: citrusCatalog,
      setSelectedCatalog: mockSetSelectedCatalog,
    });

    renderHook(() => useAutoSwitchCatalog());
    expect(mockSetSelectedCatalog).toHaveBeenCalledWith(mainCatalog);
  });

  it('should not switch when Test schema type already has Citrus catalog', () => {
    mockUseEntityContext.mockReturnValue({
      currentSchemaType: SourceSchemaType.Test,
    });
    mockUseRuntimeContext.mockReturnValue({
      basePath: '',
      catalogLibrary,
      selectedCatalog: citrusCatalog,
      setSelectedCatalog: mockSetSelectedCatalog,
    });

    renderHook(() => useAutoSwitchCatalog());
    expect(mockSetSelectedCatalog).not.toHaveBeenCalled();
  });
});
