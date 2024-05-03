import { FunctionComponent, useContext } from 'react';
import { Visualization } from '../../components/Visualization';
import { CatalogModalProvider } from '../../providers/catalog-modal.provider';
import { EntitiesContext } from '../../providers/entities.provider';
import './DesignPage.scss';
import { ReturnToSourceCodeFallback } from './ReturnToSourceCodeFallback';
import { DeleteModalContextProvider } from '../../providers/delete-modal.provider';

export const DesignPage: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
  const visualEntities = entitiesContext?.visualEntities ?? [];

  return (
    <div className="canvas-page">
      <CatalogModalProvider>
        <DeleteModalContextProvider>
          <Visualization
            className="canvas-page__canvas"
            entities={visualEntities}
            fallback={<ReturnToSourceCodeFallback />}
          />
        </DeleteModalContextProvider>
      </CatalogModalProvider>
    </div>
  );
};
