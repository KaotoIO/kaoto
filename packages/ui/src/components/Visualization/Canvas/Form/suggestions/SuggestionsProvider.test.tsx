import { SuggestionContextApi } from '@kaoto/forms';
import { render } from '@testing-library/react';
import { ReactNode } from 'react';

import { IMetadataApi, MetadataContext } from '../../../../../providers';
import { getPropertiesSuggestionProvider } from './suggestions/properties.suggestions';
import { getSimpleLanguageSuggestionProvider } from './suggestions/simple-language.suggestions';
import { sqlSyntaxSuggestionProvider } from './suggestions/sql.suggestions';
import { SuggestionRegistrar } from './SuggestionsProvider';

describe('SuggestionRegistrar', () => {
  const registerProvider = vi.fn();
  const unregisterProvider = vi.fn();
  const suggestionRegistry = {
    registerProvider,
    unregisterProvider,
  };

  let mockMetadataApi: IMetadataApi;

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
      <SuggestionContextApi.Provider value={suggestionRegistry}>
        <MetadataContext.Provider value={mockMetadataApi}>
          <SuggestionRegistrar>{children}</SuggestionRegistrar>
        </MetadataContext.Provider>
      </SuggestionContextApi.Provider>,
    );
  }

  it('registers all providers on mount', () => {
    renderWithMetadataProvider(<div>Child</div>);

    const simpleLanguageProvider = getSimpleLanguageSuggestionProvider(mockMetadataApi.getSuggestions);
    const propertiesProvider = getPropertiesSuggestionProvider(mockMetadataApi.getSuggestions);

    expect(registerProvider).toHaveBeenCalledWith(expect.objectContaining({ id: simpleLanguageProvider.id }));
    expect(registerProvider).toHaveBeenCalledWith(expect.objectContaining({ id: propertiesProvider.id }));
    expect(registerProvider).toHaveBeenCalledWith(sqlSyntaxSuggestionProvider);
  });

  it('unregisters all providers on unmount', () => {
    const { unmount } = renderWithMetadataProvider(<div>Child</div>);
    unmount();

    const simpleLanguageProvider = getSimpleLanguageSuggestionProvider(mockMetadataApi.getSuggestions);
    const propertiesProvider = getPropertiesSuggestionProvider(mockMetadataApi.getSuggestions);

    expect(unregisterProvider).toHaveBeenCalledWith(simpleLanguageProvider.id);
    expect(unregisterProvider).toHaveBeenCalledWith(propertiesProvider.id);
    expect(unregisterProvider).toHaveBeenCalledWith(sqlSyntaxSuggestionProvider.id);
  });

  it('renders children', () => {
    const { container } = renderWithMetadataProvider(<span>Snapshot Child</span>);
    expect(container).toMatchSnapshot();
  });
});
