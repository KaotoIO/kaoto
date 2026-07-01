import './TopologyPage.scss';

import { FunctionComponent, useContext } from 'react';

import { TopologyVisualization } from '../../components/Visualization/TopologyVisualization';
import { EntitiesContext } from '../../providers/entities.provider';

export const TopologyPage: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
  const visualEntities = entitiesContext?.visualEntities ?? [];

  return <TopologyVisualization className="topology-page" entities={visualEntities} />;
};
