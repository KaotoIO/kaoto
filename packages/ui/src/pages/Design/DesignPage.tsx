import { Title } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { Visualization } from '../../components/Visualization';
import { EntitiesContext } from '../../providers';
import './DesignPage.scss';

export const DesignPage: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
  const visualEntities = entitiesContext?.visualEntities ?? [];

  return (
    <div className="canvasPage">
      <Title headingLevel="h1">Visualization</Title>

      <Visualization className="canvasPage__canvas" entities={visualEntities} />
    </div>
  );
};
