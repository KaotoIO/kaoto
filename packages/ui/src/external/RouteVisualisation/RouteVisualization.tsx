import React, { useContext, useEffect, useLayoutEffect } from 'react';
import { EntitiesContext, EntitiesProvider, RuntimeProvider, VisibleFlowsProvider } from '../../providers';
import { Visualization } from '../../components/Visualization/Visualization';
import { EventNotifier } from '../../utils';

const Viz: React.FC<{ catalogUrl: string }> = ({ catalogUrl }) => {
  const entitiesContext = useContext(EntitiesContext);
  const visualEntities = entitiesContext?.visualEntities ?? [];
  return (
    <RuntimeProvider catalogUrl={catalogUrl}>
      <VisibleFlowsProvider>
        <Visualization className={'canvas-page'} entities={visualEntities} />
      </VisibleFlowsProvider>
    </RuntimeProvider>
  );
};

export const RouteVisualization: React.FC<{ catalogUrl: string; code: string; codeChange: (code: string) => void }> = ({
  catalogUrl,
  code,
  codeChange,
}) => {
  const eventNotifier = EventNotifier.getInstance();
  //
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
      <Viz catalogUrl={catalogUrl} />
    </EntitiesProvider>
  );
};
