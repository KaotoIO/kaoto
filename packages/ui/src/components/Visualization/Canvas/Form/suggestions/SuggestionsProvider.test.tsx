import { render } from '@testing-library/react';
import { ReactNode } from 'react';
import { IMetadataApi, MetadataContext } from '../../../../../providers';
import { SuggestionRegistrar } from './SuggestionsProvider';
import { sqlSyntaxSuggestionProvider } from './suggestions/sql.suggestions';
import { getPropertiesSuggestionProvider } from './suggestions/properties.suggestions';

// Mocks
const registerProvider = jest.fn();
const unregisterProvider = jest.fn();
const mockSuggestionRegistry = {
  registerProvider,
  unregisterProvider,
};

jest.mock('@kaoto/forms', () => ({
  useSuggestionRegistry: () => mockSuggestionRegistry,
}));
jest.mock('./suggestions/properties.suggestions', () => {
  const { getPropertiesSuggestionProvider } = jest.requireActual('./suggestions/properties.suggestions');
  const provider = getPropertiesSuggestionProvider(jest.fn());

  return {
    getPropertiesSuggestionProvider: jest.fn(() => provider),
  };
});
jest.mock('./suggestions/simple-language.suggestions', () => {
  const { getSimpleLanguageSuggestionProvider } = jest.requireActual('./suggestions/simple-language.suggestions');
  const provider = getSimpleLanguageSuggestionProvider(jest.fn());

  return {
    getSimpleLanguageSuggestionProvider: jest.fn(() => provider),
  };
});

describe('SuggestionRegistrar', () => {
  let mockMetadataApi: jest.Mocked<IMetadataApi>;

  beforeEach(() => {
    mockMetadataApi = {
      getMetadata: jest.fn(),
      setMetadata: jest.fn(),
      getResourceContent: jest.fn(),
      saveResourceContent: jest.fn(),
      deleteResource: jest.fn(),
      askUserForFileSelection: jest.fn(),
      getSuggestions: jest.fn(),
      shouldSaveSchema: false,
      onStepUpdated: jest.fn(),
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
