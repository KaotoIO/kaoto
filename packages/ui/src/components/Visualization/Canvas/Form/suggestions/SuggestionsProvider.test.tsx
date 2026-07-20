import { render } from '@testing-library/react';
import { ReactNode } from 'react';

import { IMetadataApi, MetadataContext } from '../../../../../providers';
import { EntitiesContext, EntitiesContextResult } from '../../../../../providers/entities.provider';
import { getCustomModeSlugSuggestionProvider } from './suggestions/custom-mode-slug.suggestions';
import { getPropertiesSuggestionProvider } from './suggestions/properties.suggestions';
import { sqlSyntaxSuggestionProvider } from './suggestions/sql.suggestions';
import { SuggestionRegistrar } from './SuggestionsProvider';

// Mocks
const registerProvider = vi.fn();
const unregisterProvider = vi.fn();
const mockSuggestionRegistry = {
  registerProvider,
  unregisterProvider,
};

vi.mock('@kaoto/forms', async () => ({
  useSuggestionRegistry: () => mockSuggestionRegistry,
}));
vi.mock('./suggestions/properties.suggestions', async () => {
  const { getPropertiesSuggestionProvider } = await vi.importActual<
    typeof import('./suggestions/properties.suggestions')
  >('./suggestions/properties.suggestions');
  const provider = getPropertiesSuggestionProvider(vi.fn());

  return {
    getPropertiesSuggestionProvider: vi.fn(() => provider),
  };
});
vi.mock('./suggestions/simple-language.suggestions', async () => {
  const { getSimpleLanguageSuggestionProvider } = await vi.importActual<
    typeof import('./suggestions/simple-language.suggestions')
  >('./suggestions/simple-language.suggestions');
  const provider = getSimpleLanguageSuggestionProvider(vi.fn());

  return {
    getSimpleLanguageSuggestionProvider: vi.fn(() => provider),
  };
});
vi.mock('./suggestions/custom-mode-slug.suggestions', async () => {
  const { getCustomModeSlugSuggestionProvider } = await vi.importActual<
    typeof import('./suggestions/custom-mode-slug.suggestions')
  >('./suggestions/custom-mode-slug.suggestions');
  const provider = getCustomModeSlugSuggestionProvider(vi.fn());

  return {
    getCustomModeSlugSuggestionProvider: vi.fn(() => provider),
  };
});

describe('SuggestionRegistrar', () => {
  let mockMetadataApi: Mocked<IMetadataApi>;
  let mockEntitiesContext: Partial<EntitiesContextResult>;

  beforeEach(() => {
    mockMetadataApi = {
      getMetadata: vi.fn(),
      setMetadata: vi.fn(),
      getResourceContent: vi.fn(),
      isResourceExist: vi.fn(),
      saveResourceContent: vi.fn(),
      deleteResource: vi.fn(),
      askUserForFileSelection: vi.fn(),
      getSuggestions: vi.fn(),
      shouldSaveSchema: false,
      onStepUpdated: vi.fn(),
    };
    mockEntitiesContext = {
      camelResource: {
        getVisualEntities: vi.fn().mockReturnValue([]),
      } as unknown as EntitiesContextResult['camelResource'],
    };
  });

  function renderWithProviders(children: ReactNode) {
    return render(
      <MetadataContext.Provider value={mockMetadataApi}>
        <EntitiesContext.Provider value={mockEntitiesContext as EntitiesContextResult}>
          <SuggestionRegistrar>{children}</SuggestionRegistrar>
        </EntitiesContext.Provider>
      </MetadataContext.Provider>,
    );
  }

  it('registers all providers on mount', () => {
    renderWithProviders(<div>Child</div>);

    const mockPropertiesProvider = getPropertiesSuggestionProvider(mockMetadataApi.getSuggestions);
    const mockCustomModeSlugProvider = getCustomModeSlugSuggestionProvider(vi.fn());

    expect(registerProvider).toHaveBeenCalledWith(mockPropertiesProvider);
    expect(registerProvider).toHaveBeenCalledWith(sqlSyntaxSuggestionProvider);
    expect(registerProvider).toHaveBeenCalledWith(mockCustomModeSlugProvider);
  });

  it('unregisters all providers on unmount', () => {
    const { unmount } = renderWithProviders(<div>Child</div>);
    unmount();

    const mockPropertiesProvider = getPropertiesSuggestionProvider(mockMetadataApi.getSuggestions);
    const mockCustomModeSlugProvider = getCustomModeSlugSuggestionProvider(vi.fn());

    expect(unregisterProvider).toHaveBeenCalledWith(mockPropertiesProvider.id);
    expect(unregisterProvider).toHaveBeenCalledWith(sqlSyntaxSuggestionProvider.id);
    expect(unregisterProvider).toHaveBeenCalledWith(mockCustomModeSlugProvider.id);
  });

  it('renders children', () => {
    const { container } = renderWithProviders(<span>Snapshot Child</span>);
    expect(container).toMatchSnapshot();
  });
});
