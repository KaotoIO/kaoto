import { Title } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { Visualization } from '../../components/Visualization';
import { CatalogModalProvider } from '../../providers/catalog-modal.provider';
import { EntitiesContext } from '../../providers/entities.provider';
import './DesignPage.scss';

export const DesignPage: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
  const visualEntities = entitiesContext?.visualEntities ?? [];

  return (
    <div className="canvasPage">
      <Title headingLevel="h1">Visualization</Title>

      <CatalogModalProvider>
        <Visualization className="canvasPage__canvas" entities={visualEntities} />
      </CatalogModalProvider>
    </div>
  );
};
