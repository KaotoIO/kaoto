import { FunctionComponent, useContext } from 'react';
import { Visualization } from '../../components/Visualization';
import { EntitiesContext } from '../../providers';
import './DesignTab.scss';

export const DesignTab: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
  const visualEntities = entitiesContext?.visualEntities ?? [];

  return <Visualization className="canvas-page" entities={visualEntities} />;
};
