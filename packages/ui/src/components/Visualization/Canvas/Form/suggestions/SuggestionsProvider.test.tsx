import { render } from '@testing-library/react';
import { ReactNode } from 'react';

import { IMetadataApi, MetadataContext } from '../../../../../providers';
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

describe('SuggestionRegistrar', () => {
  let mockMetadataApi: Mocked<IMetadataApi>;

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
  });

  function renderWithMetadataProvider(children: ReactNode) {
    return render(
      <MetadataContext.Provider value={mockMetadataApi}>
        <SuggestionRegistrar>{children}</SuggestionRegistrar>
      </MetadataContext.Provider>,
    );
  }

  it('registers all providers on mount', () => {
    renderWithMetadataProvider(<div>Child</div>);

    const mockSimpleLanguageProvider = getPropertiesSuggestionProvider(mockMetadataApi.getSuggestions);
    const mockPropertiesProvider = getPropertiesSuggestionProvider(mockMetadataApi.getSuggestions);

    expect(registerProvider).toHaveBeenCalledWith(mockSimpleLanguageProvider);
    expect(registerProvider).toHaveBeenCalledWith(mockPropertiesProvider);
    expect(registerProvider).toHaveBeenCalledWith(sqlSyntaxSuggestionProvider);
  });

  it('unregisters all providers on unmount', () => {
    const { unmount } = renderWithMetadataProvider(<div>Child</div>);
    unmount();

    const mockSimpleLanguageProvider = getPropertiesSuggestionProvider(mockMetadataApi.getSuggestions);
    const mockPropertiesProvider = getPropertiesSuggestionProvider(mockMetadataApi.getSuggestions);

    expect(unregisterProvider).toHaveBeenCalledWith(mockSimpleLanguageProvider.id);
    expect(unregisterProvider).toHaveBeenCalledWith(mockPropertiesProvider.id);
    expect(unregisterProvider).toHaveBeenCalledWith(sqlSyntaxSuggestionProvider.id);
  });

  it('renders children', () => {
    const { container } = renderWithMetadataProvider(<span>Snapshot Child</span>);
    expect(container).toMatchSnapshot();
  });
});
