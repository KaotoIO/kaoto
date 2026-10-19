import { SuggestionContextApi } from '@kaoto/forms';
import { render } from '@testing-library/react';
import { ReactNode } from 'react';

import { SourceSchemaType } from '../../../../../models/camel';
import { EntitiesContext, EntitiesContextResult, IMetadataApi, MetadataContext } from '../../../../../providers';
import { testFunctionSuggestionProvider } from './suggestions/citrus/test-function.suggestions';
import { testValidationMatcherSuggestionProvider } from './suggestions/citrus/test-validation-matcher.suggestions';
import { getTestVariableSuggestionProvider } from './suggestions/citrus/test-variable.suggestions';
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
    vi.clearAllMocks();
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

  function renderWithProviders(children: ReactNode, entitiesContextValue?: EntitiesContextResult | null) {
    return render(
      <SuggestionContextApi.Provider value={suggestionRegistry}>
        <EntitiesContext.Provider value={entitiesContextValue ?? null}>
          <MetadataContext.Provider value={mockMetadataApi}>
            <SuggestionRegistrar>{children}</SuggestionRegistrar>
          </MetadataContext.Provider>
        </EntitiesContext.Provider>
      </SuggestionContextApi.Provider>,
    );
  }

  describe('default (Camel) providers', () => {
    it('registers all providers on mount', () => {
      renderWithProviders(<div>Child</div>);

      const simpleLanguageProvider = getSimpleLanguageSuggestionProvider(mockMetadataApi.getSuggestions);
      const propertiesProvider = getPropertiesSuggestionProvider(mockMetadataApi.getSuggestions);

      expect(registerProvider).toHaveBeenCalledWith(expect.objectContaining({ id: simpleLanguageProvider.id }));
      expect(registerProvider).toHaveBeenCalledWith(expect.objectContaining({ id: propertiesProvider.id }));
      expect(registerProvider).toHaveBeenCalledWith(sqlSyntaxSuggestionProvider);
    });

    it('unregisters all providers on unmount', () => {
      const { unmount } = renderWithProviders(<div>Child</div>);
      unmount();

      const simpleLanguageProvider = getSimpleLanguageSuggestionProvider(mockMetadataApi.getSuggestions);
      const propertiesProvider = getPropertiesSuggestionProvider(mockMetadataApi.getSuggestions);

      expect(unregisterProvider).toHaveBeenCalledWith(simpleLanguageProvider.id);
      expect(unregisterProvider).toHaveBeenCalledWith(propertiesProvider.id);
      expect(unregisterProvider).toHaveBeenCalledWith(sqlSyntaxSuggestionProvider.id);
    });
  });

  describe('Citrus (Test) providers', () => {
    const mockCamelResource = {
      getVariables: vi.fn().mockReturnValue([]),
    } as unknown as EntitiesContextResult['camelResource'];

    const testEntitiesContext = {
      currentSchemaType: SourceSchemaType.Test,
      camelResource: mockCamelResource,
    } as unknown as EntitiesContextResult;

    it('registers Citrus providers when schema type is Test', () => {
      renderWithProviders(<div>Child</div>, testEntitiesContext);

      const testVariableProvider = getTestVariableSuggestionProvider(mockCamelResource);

      expect(registerProvider).toHaveBeenCalledWith(expect.objectContaining({ id: testVariableProvider.id }));
      expect(registerProvider).toHaveBeenCalledWith(testFunctionSuggestionProvider);
      expect(registerProvider).toHaveBeenCalledWith(testValidationMatcherSuggestionProvider);
    });

    it('does not register Camel providers when schema type is Test', () => {
      renderWithProviders(<div>Child</div>, testEntitiesContext);

      expect(registerProvider).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: 'simple-language-suggestion-provider' }),
      );
      expect(registerProvider).not.toHaveBeenCalledWith(sqlSyntaxSuggestionProvider);
    });

    it('unregisters Citrus providers on unmount', () => {
      const { unmount } = renderWithProviders(<div>Child</div>, testEntitiesContext);
      unmount();

      const testVariableProvider = getTestVariableSuggestionProvider(mockCamelResource);

      expect(unregisterProvider).toHaveBeenCalledWith(testVariableProvider.id);
      expect(unregisterProvider).toHaveBeenCalledWith(testFunctionSuggestionProvider.id);
      expect(unregisterProvider).toHaveBeenCalledWith(testValidationMatcherSuggestionProvider.id);
    });
  });

  it('renders children', () => {
    const { container } = renderWithProviders(<span>Snapshot Child</span>);
    expect(container).toMatchSnapshot();
  });
});
