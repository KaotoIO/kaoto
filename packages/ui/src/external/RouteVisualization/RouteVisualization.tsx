import React, { useContext, useEffect, useLayoutEffect } from 'react';
import {
  CatalogLoaderProvider,
  EntitiesContext,
  EntitiesProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
  VisibleFlowsContext,
  VisibleFlowsProvider,
} from '../../providers';
import { Visualization } from '../../components/Visualization';
import { EventNotifier } from '../../utils';
import { useReload } from '../../hooks/reload.hook';

const VisibleFlowsVisualization: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { visibleFlows, visualFlowsApi } = useContext(VisibleFlowsContext)!;
  const entitiesContext = useContext(EntitiesContext);
  const visualEntities = entitiesContext?.visualEntities ?? [];

  useEffect(() => {
    visualFlowsApi.showAllFlows();
  }, [visibleFlows, visualFlowsApi]);

  return <Visualization className={`canvas-page ${className}`} entities={visualEntities} />;
};

const Viz: React.FC<{ catalogUrl: string; className?: string }> = ({ catalogUrl, className = '' }) => {
  const ReloadProvider = useReload();

  return (
    <ReloadProvider>
      <RuntimeProvider catalogUrl={catalogUrl}>
        <SchemasLoaderProvider>
          <CatalogLoaderProvider>
            <VisibleFlowsProvider>
              <VisibleFlowsVisualization className={`canvas-page ${className}`} />
            </VisibleFlowsProvider>
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
}> = ({ catalogUrl, code, codeChange, className }) => {
  const eventNotifier = EventNotifier.getInstance();

  useLayoutEffect(() => {
    return eventNotifier.subscribe('entities:updated', (code: string) => {
      codeChange(code);
    });
  }, [eventNotifier, codeChange]);

  useEffect(() => {
    eventNotifier.next('code:updated', code);
  }, [code, eventNotifier]);

  return (
    <EntitiesProvider>
      <Viz catalogUrl={catalogUrl} className={className} />
    </EntitiesProvider>
  );
};
