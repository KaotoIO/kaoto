import { VisualizationProvider } from '@patternfly/react-topology';
import { FunctionComponent, useContext, useEffect, useLayoutEffect, useMemo } from 'react';

import { Visualization } from '../../components/Visualization';
import { ControllerService } from '../../components/Visualization/Canvas/controller.service';
import { CatalogLoaderProvider } from '../../dynamic-catalog/catalog.provider';
import { CatalogVersion, SettingsModel } from '../../models/settings/settings.model';
import {
  EntitiesContext,
  EntitiesProvider,
  ReloadProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
  VisibleFlowsContext,
  VisibleFlowsProvider,
} from '../../providers';
import { EventNotifier } from '../../utils';

const VisibleFlowsVisualization: FunctionComponent<{ className?: string }> = ({ className = '' }) => {
  const { visibleFlows, visualFlowsApi } = useContext(VisibleFlowsContext)!;
  const entitiesContext = useContext(EntitiesContext);
  const visualEntities = entitiesContext?.visualEntities ?? [];

  useEffect(() => {
    visualFlowsApi.showFlows();
  }, [visibleFlows, visualFlowsApi]);

  return <Visualization className={`canvas-page ${className}`} entities={visualEntities} />;
};

const Viz: FunctionComponent<{
  catalogUrl: string;
  camelCatalog: CatalogVersion;
  testingCatalog: CatalogVersion;
  className?: string;
}> = ({ catalogUrl, camelCatalog, testingCatalog, className = '' }) => {
  const controller = useMemo(() => ControllerService.createController(), []);

  return (
    <ReloadProvider>
      <RuntimeProvider catalogUrl={catalogUrl} camelCatalog={camelCatalog} testingCatalog={testingCatalog}>
        <SchemasLoaderProvider>
          <CatalogLoaderProvider>
            <VisualizationProvider controller={controller}>
              <VisibleFlowsProvider>
                <VisibleFlowsVisualization className={`canvas-page ${className}`} />
              </VisibleFlowsProvider>
            </VisualizationProvider>
          </CatalogLoaderProvider>
        </SchemasLoaderProvider>
      </RuntimeProvider>
    </ReloadProvider>
  );
};

export const RouteVisualization: React.FC<{
  catalogUrl: string;
  code: string;
  codeChange: (code: string) => void;
  className?: string;
  camelCatalog?: CatalogVersion;
  testingCatalog?: CatalogVersion;
}> = ({ catalogUrl, code, codeChange, className, camelCatalog, testingCatalog }) => {
  const defaultSettings = new SettingsModel();
  const eventNotifier = EventNotifier.getInstance();

  useLayoutEffect(() => {
    return eventNotifier.subscribe('entities:updated', (code: string) => {
      codeChange(code);
    });
  }, [eventNotifier, codeChange]);

  useEffect(() => {
    eventNotifier.next('code:updated', { code });
  }, [code, eventNotifier]);

  return (
    <EntitiesProvider>
      <Viz
        catalogUrl={catalogUrl}
        camelCatalog={camelCatalog ?? defaultSettings.camelCatalog}
        testingCatalog={testingCatalog ?? defaultSettings.testingCatalog}
        className={className}
      />
    </EntitiesProvider>
  );
};
