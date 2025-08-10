import { SuggestionRegistryProvider } from '@kaoto/forms';
import { VisualizationProvider } from '@patternfly/react-topology';
import { useLayoutEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { RenderingProvider } from './components/RenderingAnchor/rendering.provider';
import { ControllerService } from './components/Visualization/Canvas/controller.service';
import { RegisterComponents } from './components/registers/RegisterComponents';
import { RegisterNodeInteractionAddons } from './components/registers/RegisterNodeInteractionAddons';
import { NodeInteractionAddonProvider } from './components/registers/interactions/node-interaction-addon.provider';
import { Shell } from './layout/Shell';
import { LocalStorageSettingsAdapter } from './models/settings/localstorage-settings-adapter';
import {
  CatalogLoaderProvider,
  CatalogTilesProvider,
  EntitiesProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
  SettingsProvider,
  SourceCodeLocalStorageProvider,
  VisibleFlowsProvider,
} from './providers';
import { isDefined } from './utils';
import { CatalogSchemaLoader } from './utils/catalog-schema-loader';
import { setColorScheme } from './utils/color-scheme';
import { EditorCommandsProvider } from './providers/editor-commands.provider';

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
        <EditorCommandsProvider>
          <RuntimeProvider catalogUrl={catalogUrl}>
            <SchemasLoaderProvider>
              <CatalogLoaderProvider>
                <EntitiesProvider>
                  <Shell>
                    <CatalogTilesProvider>
                      <VisualizationProvider controller={controller}>
                        <VisibleFlowsProvider>
                          <RenderingProvider>
                            <RegisterComponents>
                              <NodeInteractionAddonProvider>
                                <RegisterNodeInteractionAddons>
                                  <SuggestionRegistryProvider>
                                    <Outlet />
                                  </SuggestionRegistryProvider>
                                </RegisterNodeInteractionAddons>
                              </NodeInteractionAddonProvider>
                            </RegisterComponents>
                          </RenderingProvider>
                        </VisibleFlowsProvider>
                      </VisualizationProvider>
                    </CatalogTilesProvider>
                  </Shell>
                </EntitiesProvider>
              </CatalogLoaderProvider>
            </SchemasLoaderProvider>
          </RuntimeProvider>
        </EditorCommandsProvider>
      </SourceCodeLocalStorageProvider>
    </SettingsProvider>
  );
}

export default App;
