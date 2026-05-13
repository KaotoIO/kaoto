import './TopologyPage.scss';

import {
  TopologyControlBar,
  TopologyView,
  useVisualizationController,
  VisualizationProvider,
  VisualizationSurface,
} from '@patternfly/react-topology';
import { FunctionComponent, useContext, useMemo } from 'react';

import { useVisibleVizNodes } from '../../hooks/use-visible-viz-nodes';
import { EntitiesContext } from '../../providers/entities.provider';
import { SettingsContext } from '../../providers/settings.provider';
import { useApplyTopologyModel } from './topology-apply-model.hook';
import { useTopologyControlButtons } from './topology-control-buttons.hook';
import { TopologyControllerService } from './topology-controller.service';
import { useTopologyLayoutPreference } from './topology-layout-preference.hook';
import { useTopologyModel } from './topology-model.hook';

const TopologyVisualization: FunctionComponent = () => {
  const controller = useVisualizationController();
  const entitiesContext = useContext(EntitiesContext);
  const settingsAdapter = useContext(SettingsContext);

  const visualEntities = useMemo(() => entitiesContext?.visualEntities ?? [], [entitiesContext?.visualEntities]);
  // Topology shows every route regardless of the global visible-flows filter applied on the Design canvas.
  const allFlowsVisible = useMemo(
    () => visualEntities.reduce<Record<string, boolean>>((acc, entity) => ({ ...acc, [entity.id]: true }), {}),
    [visualEntities],
  );
  const { vizNodes } = useVisibleVizNodes(visualEntities, allFlowsVisible);

  const { activeLayout } = useTopologyLayoutPreference(settingsAdapter);
  const { model, topLevelGroupIds } = useTopologyModel(vizNodes, visualEntities, activeLayout);
  useApplyTopologyModel(controller, model, topLevelGroupIds);
  const controlButtons = useTopologyControlButtons(controller, settingsAdapter);

  return (
    <TopologyView controlBar={<TopologyControlBar controlButtons={controlButtons} />}>
      <VisualizationSurface />
    </TopologyView>
  );
};

export const TopologyPage: FunctionComponent = () => {
  const controller = useMemo(() => TopologyControllerService.createController(), []);

  return (
    <div className="topology-page">
      <VisualizationProvider controller={controller}>
        <TopologyVisualization />
      </VisualizationProvider>
    </div>
  );
};
