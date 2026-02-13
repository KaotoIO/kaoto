import { isDefined, SuggestionRegistryProvider } from '@kaoto/forms';
import { VisualizationProvider } from '@patternfly/react-topology';
import { useLayoutEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';

import { NodeInteractionAddonProvider } from './components/registers/interactions/node-interaction-addon.provider';
import { RegisterComponents } from './components/registers/RegisterComponents';
import { RegisterNodeInteractionAddons } from './components/registers/RegisterNodeInteractionAddons';
import { RenderingProvider } from './components/RenderingAnchor/rendering.provider';
import { ControllerService } from './components/Visualization/Canvas/controller.service';
import { CatalogLoaderProvider } from './dynamic-catalog/catalog.provider';
import { CatalogTilesProvider } from './dynamic-catalog/catalog-tiles.provider';
import { Shell } from './layout/Shell';
import { LocalStorageSettingsAdapter } from './models/settings/localstorage-settings-adapter';
import {
  CollapsedGroupsProvider,
  EntitiesProvider,
  KeyboardShortcutsProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
  SettingsProvider,
  SourceCodeLocalStorageProvider,
  VisibleFlowsProvider,
} from './providers';
import { CatalogSchemaLoader } from './utils/catalog-schema-loader';
import { setColorScheme } from './utils/color-scheme';

function App() {
  const controller = useMemo(() => ControllerService.createController(), []);
  const settingsAdapter = new LocalStorageSettingsAdapter();
  let catalogUrl = CatalogSchemaLoader.DEFAULT_CATALOG_PATH;
  const settingsCatalogUrl = settingsAdapter.getSettings().catalogUrl;
  const colorSchema = settingsAdapter.getSettings().colorScheme;

  if (isDefined(settingsCatalogUrl) && settingsCatalogUrl !== '') {
    catalogUrl = settingsCatalogUrl;
  }

  useLayoutEffect(() => {
    setColorScheme(colorSchema);
  }, [colorSchema]);

  return (
    <SettingsProvider adapter={settingsAdapter}>
      <SourceCodeLocalStorageProvider>
        <RuntimeProvider catalogUrl={catalogUrl}>
          <SchemasLoaderProvider>
            <CatalogLoaderProvider>
              <EntitiesProvider>
                <Shell>
                  <CatalogTilesProvider>
                    <VisualizationProvider controller={controller}>
                      <CollapsedGroupsProvider>
                        <VisibleFlowsProvider>
                          <RenderingProvider>
                            <RegisterComponents>
                              <NodeInteractionAddonProvider>
                                <RegisterNodeInteractionAddons>
                                  <SuggestionRegistryProvider>
                                    <KeyboardShortcutsProvider>
                                      <Outlet />
                                    </KeyboardShortcutsProvider>
                                  </SuggestionRegistryProvider>
                                </RegisterNodeInteractionAddons>
                              </NodeInteractionAddonProvider>
                            </RegisterComponents>
                          </RenderingProvider>
                        </VisibleFlowsProvider>
                      </CollapsedGroupsProvider>
                    </VisualizationProvider>
                  </CatalogTilesProvider>
                </Shell>
              </EntitiesProvider>
            </CatalogLoaderProvider>
          </SchemasLoaderProvider>
        </RuntimeProvider>
      </SourceCodeLocalStorageProvider>
    </SettingsProvider>
  );
}

export default App;
