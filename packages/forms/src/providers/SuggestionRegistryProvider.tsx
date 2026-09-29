import { JSONSchema4 } from 'json-schema';
import { createContext, FunctionComponent, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { SuggestionProvider } from '../models/suggestions';

interface SuggestionContextApi {
  registerProvider: (provider: SuggestionProvider) => void;
  unregisterProvider: (id: string) => void;
}
type MenuStateSetter = (menuId: string | null | ((prev: string | null) => string | null)) => void;

interface SuggestionContext {
  getProviders: (propertyName: string, schema: JSONSchema4) => SuggestionProvider[];
  currentOpenMenu: string | null;
  setCurrentOpenMenu: MenuStateSetter;
}

export const SuggestionContextApi = createContext<SuggestionContextApi | undefined | null>(undefined);
export const SuggestionContext = createContext<SuggestionContext>({
  getProviders: () => [],
  currentOpenMenu: null,
  setCurrentOpenMenu: () => {},
});

export const SuggestionRegistryProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const [providers, setProviders] = useState<SuggestionProvider[]>([]);
  const [currentOpenMenu, setCurrentOpenMenu] = useState<string | null>(null);

  const registerProvider = useCallback((provider: SuggestionProvider) => {
    setProviders((prevProviders) => {
      if (prevProviders.some((p) => p.id === provider.id)) {
        console.warn(`Suggestion provider with ID "${provider.id}" already registered.`);
        return prevProviders;
      }
      return [...prevProviders, provider];
    });
  }, []);

  const unregisterProvider = useCallback((id: string) => {
    setProviders((prevProviders) => prevProviders.filter((p) => p.id !== id));
  }, []);

  const getProviders = useCallback(
    (propertyName: string, schema: JSONSchema4) => {
      if (!schema) return providers;
      return providers.filter((provider) => provider.appliesTo(propertyName, schema));
    },
    [providers],
  );

  const contextApi = useMemo(
    () => ({
      registerProvider,
      unregisterProvider,
    }),
    [registerProvider, unregisterProvider],
  );

  const contextValue = useMemo(
    () => ({
      getProviders,
      currentOpenMenu,
      setCurrentOpenMenu,
    }),
    [getProviders, currentOpenMenu],
  );

  return (
    <SuggestionContextApi.Provider value={contextApi}>
      <SuggestionContext.Provider value={contextValue}>{children}</SuggestionContext.Provider>
    </SuggestionContextApi.Provider>
  );
};

export const useSuggestionRegistry = () => {
  const context = useContext(SuggestionContextApi);
  if (context === undefined) {
    throw new Error('useSuggestionRegistry must be used within a SuggestionRegistryProvider');
  }
  return context;
};
