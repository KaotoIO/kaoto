import { VisualizationProvider } from '@patternfly/react-topology';
import { FunctionComponent, useContext, useEffect, useLayoutEffect, useMemo } from 'react';

import { Visualization } from '../../components/Visualization';
import { ControllerService } from '../../components/Visualization/Canvas/controller.service';
import { CatalogLoaderProvider } from '../../dynamic-catalog/catalog.provider';
import {
  EntitiesContext,
  EntitiesProvider,
  KaotoResourceProvider,
  ReloadProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
  VisibleFlowsContext,
  VisibleFlowsProvider,
} from '../../providers';
import { EventNotifier } from '../../utils';

const VisibleFlowsVisualization: FunctionComponent<{ className?: string }> = ({ className = '' }) => {
  const { visualFlowsApi } = useContext(VisibleFlowsContext)!;
  const entitiesContext = useContext(EntitiesContext);
  const visualEntities = entitiesContext?.visualEntities ?? [];

  // `showFlows()` dispatches an action that returns a new `visibleFlows`
  // reference, so depending on `visibleFlows` here would re-run this effect
  // indefinitely. We only need to reveal the flows once per api instance.
  useEffect(() => {
    visualFlowsApi.showFlows();
  }, [visualFlowsApi]);

  return <Visualization className={`canvas-page ${className}`} entities={visualEntities} />;
};

const Viz: FunctionComponent<{
  catalogUrl: string;
  runtimeCatalogName: string;
  testingCatalogName: string;
  className?: string;
}> = ({ catalogUrl, runtimeCatalogName, testingCatalogName, className = '' }) => {
  const controller = useMemo(() => ControllerService.createController(), []);

  return (
    <ReloadProvider>
      <KaotoResourceProvider>
        <RuntimeProvider
          catalogUrl={catalogUrl}
          runtimeCatalogName={runtimeCatalogName}
          testingCatalogName={testingCatalogName}
        >
          <SchemasLoaderProvider>
            <CatalogLoaderProvider>
              <EntitiesProvider>
                <VisualizationProvider controller={controller}>
                  <VisibleFlowsProvider>
                    <VisibleFlowsVisualization className={className} />
                  </VisibleFlowsProvider>
                </VisualizationProvider>
              </EntitiesProvider>
            </CatalogLoaderProvider>
          </SchemasLoaderProvider>
        </RuntimeProvider>
      </KaotoResourceProvider>
    </ReloadProvider>
  );
};

export const RouteVisualization: FunctionComponent<{
  catalogUrl: string;
  runtimeCatalogName: string;
  testingCatalogName: string;
  code: string;
  codeChange: (code: string) => void;
  className?: string;
}> = ({ catalogUrl, runtimeCatalogName, testingCatalogName, code, codeChange, className }) => {
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
    <Viz
      catalogUrl={catalogUrl}
      runtimeCatalogName={runtimeCatalogName}
      testingCatalogName={testingCatalogName}
      className={className}
    />
  );
};
