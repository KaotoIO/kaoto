import { Title } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { Visualization } from '../../components/Visualization';
import { CatalogModalProvider } from '../../providers/catalog-modal.provider';
import { EntitiesContext } from '../../providers/entities.provider';
import { ReturnToSourceCodeFallback } from './ReturnToSourceCodeFallback';
import './DesignPage.scss';

export const DesignPage: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
  const visualEntities = entitiesContext?.visualEntities ?? [];

  return (
    <div className="canvas-page">
      <Title headingLevel="h1">Visualization</Title>

      <CatalogModalProvider>
        <Visualization
          className="canvas-page__canvas"
          entities={visualEntities}
          fallback={<ReturnToSourceCodeFallback />}
        />
      </CatalogModalProvider>
    </div>
  );
};
