import { VisualizationProvider } from '@patternfly/react-topology';
import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { RenderingProvider } from './components/RenderingAnchor/rendering.provider';
import { ControllerService } from './components/Visualization/Canvas/controller.service';
import { RegisterComponents } from './components/registers/RegisterComponents';
import { RegisterNodeInteractionAddons } from './components/registers/RegisterNodeInteractionAddons';
import { NodeInteractionAddonProvider } from './components/registers/interactions/node-interaction-addon.provider';
import { useReload } from './hooks/reload.hook';
import { Shell } from './layout/Shell';
import { LocalStorageSettingsAdapter } from './models/settings/localstorage-settings-adapter';
import {
  CatalogLoaderProvider,
  CatalogTilesProvider,
  EntitiesProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
  SettingsProvider,
  SourceCodeProvider,
  VisibleFlowsProvider,
} from './providers';
import { isDefined } from './utils';
import { CatalogSchemaLoader } from './utils/catalog-schema-loader';

function App() {
  const ReloadProvider = useReload();
  const controller = useMemo(() => ControllerService.createController(), []);
  const settingsAdapter = new LocalStorageSettingsAdapter();
  let catalogUrl = CatalogSchemaLoader.DEFAULT_CATALOG_PATH;
  const settingsCatalogUrl = settingsAdapter.getSettings().catalogUrl;

  if (isDefined(settingsCatalogUrl) && settingsCatalogUrl !== '') {
    catalogUrl = settingsCatalogUrl;
  }

  return (
    <ReloadProvider>
      <SettingsProvider adapter={settingsAdapter}>
        <SourceCodeProvider>
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
                                  <Outlet />
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
        </SourceCodeProvider>
      </SettingsProvider>
    </ReloadProvider>
  );
}

export default App;
